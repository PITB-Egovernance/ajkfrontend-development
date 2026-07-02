import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Hash,
  Eye,
  RefreshCw,
  MoreVertical,
  Download,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import RollNumberApi from 'api/rollNumberApi';
import Config from 'config/baseUrl';
import { formatDate } from 'utils/dateUtils';
import { hasPermission } from 'utils/permissions';

const PERM = 'roll_number.roll_number_generation';

const DEFAULT_FILTERS = {
  search: '',
  advertisement_no: '',
  preferred_exam_city: '',
  exam_center: '',
  payment_status: '',
  slip_status: '',
};

const FILTER_CONFIG = [
  { name: 'search', label: 'Search (Name / CNIC / Ref ID / Roll No)', type: 'text', placeholder: 'Search by name, CNIC, Ref ID, or Roll No' },
  { name: 'advertisement_no', label: 'Advertisement No', type: 'text', placeholder: 'e.g. Advertisement 50-26' },
  { name: 'exam_center', label: 'Exam Center', type: 'text', placeholder: 'e.g. Muzaffarabad' },
  { name: 'preferred_exam_city', label: 'Preferred Exam City', type: 'text', placeholder: 'e.g. Rawalakot' },
  {
    name: 'payment_status',
    label: 'Payment Status',
    type: 'select',
    options: [
      { value: 'paid', label: 'Paid' },
      { value: 'unpaid', label: 'Unpaid' },
    ],
  },
  {
    name: 'slip_status',
    label: 'Slip Status',
    type: 'select',
    options: [
      { value: 'published', label: 'Published' },
      { value: 'pending', label: 'Pending' },
    ],
  },
];

const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders':    { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
  '& .MuiDataGrid-cell':             { padding: '0 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#334155' },
  '& .MuiDataGrid-row':              { minHeight: '52px !important', '&:hover': { backgroundColor: '#f8fafc' } },
  '& .MuiDataGrid-footerContainer':  { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-checkboxInput svg':             { color: '#064e3b' },
  '& .MuiDataGrid-checkboxInput.Mui-checked svg':  { color: '#064e3b' },
  '& .MuiCheckbox-root .MuiSvgIcon-root':          { color: '#064e3b' },
  '& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root': { color: '#064e3b' },
  '& .MuiDataGrid-row.Mui-selected':       { backgroundColor: '#ecfdf5' },
  '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: '#d1fae5' },
};

const RollNumberManagement = () => {
  const navigate = useNavigate();

  const canEdit = hasPermission(`${PERM}.edit`);
  const canDelete = hasPermission(`${PERM}.delete`);

  const [allRows,         setAllRows]          = useState([]);
  const [loading,         setLoading]          = useState(true);
  const [paginationModel, setPaginationModel]  = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]   = useState([]);
  const selectedIds = useMemo(() => {
    if (!selectionModel) return [];
    if (Array.isArray(selectionModel)) return selectionModel;
    if (selectionModel.ids instanceof Set) return Array.from(selectionModel.ids);
    if (Array.isArray(selectionModel.ids)) return selectionModel.ids;
    if (selectionModel instanceof Set) return Array.from(selectionModel);
    return [];
  }, [selectionModel]);
  const [filters,         setFilters]          = useState(DEFAULT_FILTERS);

  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // ── Admin advertisements (source of truth for advertisement number) ────
  const fetchAdminAdvertisementMap = useCallback(async () => {
    const map = {};
    try {
      const result = await RollNumberApi.getAdvertisementsWithJobs(200);
      const ads = result?.data?.data ?? result?.data ?? [];
      (Array.isArray(ads) ? ads : []).forEach((ad) => {
        if (!ad.adv_number) return;
        // adv_number is sometimes stored with the "Advertisement " prefix
        // already baked in, sometimes bare — avoid double-prefixing.
        const raw = String(ad.adv_number).trim();
        const advNo = /^advertisement\b/i.test(raw) ? raw : `Advertisement ${raw}`;
        if (ad.hash_id) map[ad.hash_id] = advNo;
        (ad.job_details || []).forEach((job) => {
          if (job?.hash_id) map[job.hash_id] = advNo;
        });
      });
    } catch {
      // silent — falls back to candidate-portal's own adv_number
    }
    return map;
  }, []);

  // ── Full candidate-portal application list (optional enrichment only) ──
  const fetchAllCandidateApplications = useCallback(async () => {
    const headers = { Accept: 'application/json', 'X-API-KEY': Config.candidateApiKey };
    let allApps = [];
    try {
      const firstRes = await fetch(`${Config.candidateApiUrl}/applications?per_page=100`, { headers });
      const firstJson = await firstRes.json();
      const firstPage = firstJson?.data?.data ?? firstJson?.data ?? [];
      const lastPage = firstJson?.data?.last_page ?? 1;
      allApps = [...firstPage];

      if (lastPage > 1) {
        const remaining = await Promise.all(
          Array.from({ length: Math.min(lastPage - 1, 9) }, (_, i) =>
            fetch(`${Config.candidateApiUrl}/applications?per_page=100&page=${i + 2}`, { headers })
              .then((r) => r.json())
              .then((j) => j?.data?.data ?? [])
              .catch(() => [])
          )
        );
        remaining.forEach((page) => { allApps = allApps.concat(page); });
      }
    } catch {
      // silent — portal enrichment simply won't be available
    }
    return allApps;
  }, []);

  // ── Data: admin-first fetch (portal used only for optional enrichment) ──
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      // PRIMARY: fetch all generated roll number records from admin API
      const adminRollRecords = [];
      try {
        let page = 1;
        for (let i = 0; i < 10; i++) {
          const result = await RollNumberApi.getShortlisted({ per_page: 200, page });
          const data = result?.data?.data ?? [];
          adminRollRecords.push(...data);
          const lastPage = result?.data?.last_page ?? 1;
          if (page >= lastPage || data.length === 0) break;
          page += 1;
        }
      } catch { /* silent */ }

      // SECONDARY: advertisement map for adv_no resolution
      let advMap = {};
      try { advMap = await fetchAdminAdvertisementMap(); } catch { /* silent */ }

      // OPTIONAL: candidate portal data for preferred_exam_cities / payment_status enrichment
      let portalAppsMap = {};
      try {
        const portalApps = await fetchAllCandidateApplications();
        (portalApps || []).forEach(app => {
          if (app.application_number) portalAppsMap[app.application_number] = app;
        });
      } catch { /* silent */ }

      // Build rows directly from admin roll records
      const rows = adminRollRecords
        .filter(item => item.application_number && item.roll_number)
        .map(item => {
          const portalApp = portalAppsMap[item.application_number] || {};
          const snapshot = portalApp.snapshot_data || {};
          const extAdvId = portalApp.job_post?.ext_adv_id || null;
          const extAdvId2 = portalApp.job_post?.ext_advertisement_id || null;
          const resolvedAdvNo = (extAdvId && advMap[extAdvId])
            || (extAdvId2 && advMap[extAdvId2])
            || portalApp.job_post?.adv_number
            || item.adv_number
            || 'N/A';

          const rollStr = typeof item.roll_number === 'string' ? item.roll_number
                        : (item.roll_number?.roll_number || null);

          return {
            id:                item.application_number,
            application_number: item.application_number,
            applicant_name:    item.candidate_name || snapshot.name || portalApp.candidate?.name || 'N/A',
            cnic:              item.candidate_cnic || snapshot.cnic || portalApp.candidate?.cnic || 'N/A',
            job_title:         portalApp.job_post?.post_title || portalApp.job_post?.title || item.designation || 'N/A',
            advertisement_no:  resolvedAdvNo,
            applied_at:        item.applied_at || portalApp.submitted_at || portalApp.created_at
              ? formatDate(item.applied_at || portalApp.submitted_at || portalApp.created_at) : 'N/A',
            payment_status:    portalApp.payment?.payment_status || portalApp.payment_status
              || (item.paid_at ? 'paid' : 'N/A'),
            preferred_exam_cities: (portalApp.preferred_exam_cities || [])
              .map(c => typeof c === 'string' ? c : (c?.city || c?.name || '')).filter(Boolean),
            roll_number:       rollStr,
            exam_center:       item.exam_center || null,
            exam_city:         item.exam_city || null,
            published_at:      item.published_at || null,
          };
        });

      setAllRows(rows);
    } catch (err) {
      toast.error(err?.message || 'Failed to load roll number slips');
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAdminAdvertisementMap, fetchAllCandidateApplications]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ── Filtering (client-side, since data needed for filters spans both
  // the candidate portal and the admin roll-number table) ────────────────
  const filteredRows = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const advNo = filters.advertisement_no.trim().toLowerCase();
    const city = filters.preferred_exam_city.trim().toLowerCase();
    const center = filters.exam_center.trim().toLowerCase();

    return allRows.filter((row) => {
      if (search) {
        const haystack = `${row.applicant_name} ${row.cnic} ${row.application_number} ${row.roll_number || ''}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (advNo && !row.advertisement_no.toLowerCase().includes(advNo)) return false;
      if (center && !(row.exam_center || '').toLowerCase().includes(center)) return false;
      if (city && !row.preferred_exam_cities.some((c) => c.toLowerCase().includes(city))) return false;
      if (filters.payment_status && (row.payment_status || '').toLowerCase() !== filters.payment_status) return false;
      if (filters.slip_status === 'published' && !row.published_at) return false;
      if (filters.slip_status === 'pending' && row.published_at) return false;
      return true;
    });
  }, [allRows, filters]);

  const pagedRows = useMemo(() => {
    const start = paginationModel.page * paginationModel.pageSize;
    return filteredRows.slice(start, start + paginationModel.pageSize);
  }, [filteredRows, paginationModel]);

  useEffect(() => {
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }, [filters]);

  // ── Filters ─────────────────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // ── Slip download ───────────────────────────────────────────────────────────
  const downloadSlip = useCallback(async (applicationNumber) => {
    const tid = toast.loading('Preparing slip PDF…');
    try {
      const res = await RollNumberApi.downloadSlip(applicationNumber);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.dismiss(tid);
        toast.error(err.message || 'Failed to download slip');
        return;
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `AdmissionSlip_${applicationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.dismiss(tid);
      toast.success('Slip downloaded successfully');
    } catch {
      toast.dismiss(tid);
      toast.error('Could not download slip');
    }
  }, []);

  // ── Slip deletion ───────────────────────────────────────────────────────────
  const deleteSlip = async (row) => {
    const applicationNumber = row?.application_number;
    if (!applicationNumber) return;

    const ok = await confirmDelete({
      title:      'Delete Roll Number Slip',
      message:    `Remove roll number ${row.roll_number || ''} for ${row.applicant_name || applicationNumber}?`,
      identifier: applicationNumber,
      warning:    'The candidate will lose this roll number and exam center allocation. You can regenerate a new slip afterwards.',
    });
    if (!ok) return;

    const tid = toast.loading('Deleting slip…');
    try {
      await RollNumberApi.deleteSlip(applicationNumber);
      toast.dismiss(tid);
      toast.success('Roll number slip deleted successfully');
      fetchApplications();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to delete slip');
    }
  };

  // ── Bulk slip deletion ──────────────────────────────────────────────────────
  const bulkDeleteSlips = async () => {
    if (selectedIds.length === 0) return;

    const rowsWithRoll = allRows.filter(r => selectedIds.includes(r.id) && r.roll_number);
    if (rowsWithRoll.length === 0) {
      toast.error('None of the selected candidates have a roll number to delete');
      return;
    }

    const ok = await confirmDelete({
      title:      'Delete Roll Number Slips',
      message:    `Remove roll numbers and exam center allocation for ${rowsWithRoll.length} selected candidate${rowsWithRoll.length === 1 ? '' : 's'}?`,
      identifier: `${rowsWithRoll.length} slips`,
      warning:    'Those candidates will lose their roll numbers and allocations. You can regenerate new slips afterwards.',
    });
    if (!ok) return;

    const tid = toast.loading(`Deleting ${rowsWithRoll.length} slip${rowsWithRoll.length === 1 ? '' : 's'}…`);
    try {
      const result = await RollNumberApi.bulkDeleteSlips(rowsWithRoll.map(r => r.application_number));
      toast.dismiss(tid);
      const count = result.data?.deleted ?? rowsWithRoll.length;
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} deleted successfully`);
      setSelectionModel([]);
      fetchApplications();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to delete slips');
    }
  };

  // ── Row menu ────────────────────────────────────────────────────────────
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const handleView = () => {
    if (selectedRow) navigate(`/dashboard/applications/${selectedRow.application_number}`);
    handleMenuClose();
  };

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     allRows.length,
    published: allRows.filter((r) => r.published_at).length,
    pending:   allRows.filter((r) => !r.published_at).length,
    centers:   new Set(allRows.map((r) => r.exam_center).filter(Boolean)).size,
  }), [allRows]);

  // ── Columns ─────────────────────────────
  const columns = [
    { field: 'application_number', headerName: 'Ref ID',          minWidth: 110, flex: 0.8 },
    { field: 'applicant_name',     headerName: 'Applicant Name',  minWidth: 160, flex: 1.1 },
    { field: 'advertisement_no',     headerName: 'Advertisement Number',  minWidth: 170, flex: 1.1 },
    { field: 'job_title',     headerName: 'Job Advertisement',  minWidth: 160, flex: 1.1 },
    { field: 'cnic',               headerName: 'CNIC',            minWidth: 150, flex: 0.9 },
    {
      field: 'preferred_exam_cities',
      headerName: 'Exam City Preferences',
      minWidth: 180,
      flex: 1.0,
      renderCell: (p) => {
        const cities = p.value || [];
        if (cities.length === 0) {
          return <span className="text-slate-400 text-xs">Not specified</span>;
        }
        return (
          <div className="flex flex-col gap-1">
            {cities.map((city, idx) => (
              <span key={idx} className="text-sm text-slate-700">
                <span className="font-medium text-xs uppercase text-slate-500 mr-1">{idx + 1}.</span> {city}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      field: 'roll_number',
      headerName: 'Roll Number',
      minWidth: 140,
      flex: 0.9,
      renderCell: (p) => p.value
        ? <span className="font-mono font-bold text-indigo-700">{p.value}</span>
        : <span className="text-slate-400 text-xs">Not generated</span>,
    },
    {
      field: 'exam_center',
      headerName: 'Exam Center',
      minWidth: 160,
      flex: 1.0,
      renderCell: (p) => p.value
        ? <span className="text-sm text-slate-700">{p.value}{p.row.exam_city ? ` (${p.row.exam_city})` : ''}</span>
        : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      field: 'published_at',
      headerName: 'Slip Status',
      minWidth: 110,
      flex: 0.6,
      renderCell: (p) => p.value
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Published</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">—</span>,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      minWidth: 80,
      flex: 0.4,
      sortable: false,
      resizable: false,
      renderCell: (p) => (
        <IconButton size="small" onClick={(e) => handleMenuOpen(e, p.row)}>
          <MoreVertical size={18} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto">

        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"><Hash size={22} className="text-indigo-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Roll Number Management</h1>
              <p className="text-sm text-slate-500 mt-1">View and manage candidates with generated roll number slips.</p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
            <CardContent className="p-4">
              <p className="text-xs text-indigo-700 font-medium">Roll Slips Generated</p>
              <h2 className="text-2xl font-bold text-indigo-900 mt-1">{stats.total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-700 font-medium">Slips Published</p>
              <h2 className="text-2xl font-bold text-emerald-900 mt-1">{stats.published}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-4">
              <p className="text-xs text-amber-700 font-medium">Slips Pending</p>
              <h2 className="text-2xl font-bold text-amber-900 mt-1">{stats.pending}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs text-blue-700 font-medium">Exam Centers Used</p>
              <h2 className="text-2xl font-bold text-blue-900 mt-1">{stats.centers}</h2>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={FILTER_CONFIG}
          title="Filter Applications"
          extraFilters={
            <Button variant="outline" size="md" onClick={fetchApplications} disabled={loading}
              className="h-10 w-10 min-w-[2.5rem] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 self-end"
              title="Refresh List" aria-label="Refresh List">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          }
        />

        {/* BULK BAR */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-emerald-800 font-medium">
                {selectedIds.length} candidate{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                {canDelete && (
                  <Button onClick={bulkDeleteSlips} variant="outline" size="sm"
                    className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={allRows.filter(r => selectedIds.includes(r.id) && r.roll_number).length === 0}>
                    <Trash2 size={14} /> Delete Roll No Slip
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GRID */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && allRows.length === 0 ? (
            <div className="p-10 flex justify-center">
              <InlineLoader text="Loading applications..." variant="ring" size="lg" />
            </div>
          ) : filteredRows.length === 0 && !loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Eye size={32} className="text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No roll number slips found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                {allRows.length === 0
                  ? 'Roll number slips will appear here once they are generated through the exam flow.'
                  : 'No slips match the current filters.'}
              </p>
            </div>
          ) : (
            <TooltipDataGrid
              rows={pagedRows}
              columns={columns}
              getRowId={(r) => r.id}
              paginationMode="server"
              rowCount={filteredRows.length}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[15, 25, 50, 100]}
              checkboxSelection
              onRowSelectionModelChange={(s) => setSelectionModel(s)}
              rowSelectionModel={selectionModel}
              disableRowSelectionOnClick
              autoHeight
              loading={loading}
              sx={gridSx}
            />
          )}
        </div>
      </div>

      {/* ROW MENU */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <MenuItem key="view" onClick={handleView}>
          <Eye size={16} style={{ marginRight: '8px' }} className="text-blue-600" /> View Application
        </MenuItem>
        {canEdit && (
          <MenuItem key="edit"
            onClick={() => { const row = selectedRow; handleMenuClose(); if (row) navigate('/dashboard/roll-numbers/edit-slip/' + row.application_number, { state: { row } }); }}
            disabled={!selectedRow?.roll_number}>
            <Pencil size={16} style={{ marginRight: '8px' }} className="text-amber-600" /> Edit Slip
          </MenuItem>
        )}
        <MenuItem key="download" onClick={() => { downloadSlip(selectedRow?.application_number); handleMenuClose(); }}
          disabled={!selectedRow?.roll_number}>
          <Download size={16} style={{ marginRight: '8px' }} className="text-violet-600" /> Download Slip PDF
        </MenuItem>
        {canDelete && (
          <MenuItem key="delete" onClick={() => { const row = selectedRow; handleMenuClose(); deleteSlip(row); }}
            disabled={!selectedRow?.roll_number}>
            <Trash2 size={16} style={{ marginRight: '8px' }} className="text-red-600" /> Delete Slip
          </MenuItem>
        )}
      </Menu>

    </div>
  );
};

export default RollNumberManagement;
