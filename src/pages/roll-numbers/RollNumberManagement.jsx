import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  TextField,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Hash,
  Eye,
  RefreshCw,
  FilterX,
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
import RollNumberApi from 'api/rollNumberApi';
import Config from 'config/baseUrl';
import { formatDate } from 'utils/dateUtils';
import { hasPermission } from 'utils/permissions';

const PERM = 'roll_number.roll_number_generation';

const DEFAULT_FILTERS = {
  search: '',
  advertisement_no: '',
  generated: '',
  preferred_exam_city: '',
  status: '',
};

const STATUS_COLORS = {
  Shortlisted: 'bg-green-100 text-green-700',
  Rejected:    'bg-red-100 text-red-700',
  Interview:   'bg-blue-100 text-blue-700',
};

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

  const [rows,            setRows]            = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [total,           setTotal]           = useState(0);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });
  const [selectionModel,  setSelectionModel]  = useState([]);
  const selectedIds = useMemo(() => {
    if (!selectionModel) return [];
    if (Array.isArray(selectionModel)) return selectionModel;
    if (selectionModel.ids instanceof Set) return Array.from(selectionModel.ids);
    if (Array.isArray(selectionModel.ids)) return selectionModel.ids;
    if (selectionModel instanceof Set) return Array.from(selectionModel);
    return [];
  }, [selectionModel]);
  const [filters,         setFilters]         = useState(DEFAULT_FILTERS);

  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // ── Data (fetches from candidate portal API) ─────────────────────────
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const candidateHeaders = { Accept: 'application/json', 'X-API-KEY': Config.candidateApiKey };
      const params = new URLSearchParams();
      params.set('per_page', String(paginationModel.pageSize));
      params.set('page', String(paginationModel.page + 1));
      if (filters.search) params.set('search', filters.search);
      if (filters.advertisement_no) params.set('job_id', filters.advertisement_no);

      const res = await fetch(`${Config.candidateApiUrl}/applications?${params}`, { headers: candidateHeaders });
      const result = await res.json();

      const payload = result.data ?? result ?? {};
      const data = payload.data ?? [];

      const mapped = (Array.isArray(data) ? data : []).map((item) => {
        const snapshot = item.snapshot_data || {};
        return {
          id:                item.application_number || item.hash_id || String(item.id),
          application_number: item.application_number,
          applicant_name:    snapshot.name || item.candidate?.name || item.profile?.full_name || 'N/A',
          cnic:              snapshot.cnic || item.candidate?.cnic || item.profile?.cnic || 'N/A',
          job_title:         item.job_post?.post_title || item.job_post?.title || 'N/A',
          advertisement_no:  item.job_post?.ext_adv_id || item.advertisement_no || item.job_post?.adv_number || 'N/A',
          applied_at:        item.submitted_at || item.created_at ? formatDate(item.submitted_at || item.created_at) : 'N/A',
          payment_status:    item.payment?.payment_status || item.payment_status || (item.payment?.paid_at ? 'paid' : 'unpaid'),
          preferred_exam_cities: (item.preferred_exam_cities || []).map(c => typeof c === 'string' ? c : (c?.city || c?.name || '')).filter(Boolean),
          roll_number:       null,
          published_at:      null,
        };
      });

      setRows(mapped);
      setTotal(payload.total ?? mapped.length);
    } catch (err) {
      toast.error(err?.message || 'Failed to load applications from candidate portal');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, filters]);

  useEffect(() => {
    const t = setTimeout(fetchApplications, 300);
    return () => clearTimeout(t);
  }, [fetchApplications]);

  // ── Filters ─────────────────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
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

    const rowsWithRoll = rows.filter(r => selectedIds.includes(r.id) && r.roll_number);
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
    total:        total || rows.length,
    shortlisted:  rows.filter((r) => r.status === 'Shortlisted').length,
    withRoll:     rows.filter((r) => r.roll_number).length,
    published:    rows.filter((r) => r.published_at).length,
  }), [rows, total]);

  // ── Columns ─────────────────────────────
  const columns = [
    { field: 'application_number', headerName: 'Ref ID',          minWidth: 110, flex: 0.8 },
    { field: 'applicant_name',     headerName: 'Applicant Name',  minWidth: 160, flex: 1.1 },
    { field: 'advertisement_no',     headerName: 'Advertisement Number',  minWidth: 160, flex: 1.1 },
    { field: 'job_title',     headerName: 'Job Advertisement',  minWidth: 160, flex: 1.1 },
    { field: 'cnic',               headerName: 'CNIC',            minWidth: 150, flex: 0.9 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.6,
      renderCell: (p) => {
        if (!p.value) return <span className="text-slate-400 text-xs">—</span>;
        const color = STATUS_COLORS[p.value] || 'bg-slate-100 text-slate-600';
        return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{p.value}</span>;
      },
    },
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
              <h1 className="text-2xl font-bold text-slate-900">Applications & Roll Number Management</h1>
              <p className="text-sm text-slate-500 mt-1">View all received applications and manage roll number slips.</p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <CardContent className="p-4">
              <p className="text-xs text-blue-700 font-medium">Total Applications</p>
              <h2 className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
            <CardContent className="p-4">
              <p className="text-xs text-green-700 font-medium">Shortlisted</p>
              <h2 className="text-2xl font-bold text-green-900 mt-1">{stats.shortlisted}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
            <CardContent className="p-4">
              <p className="text-xs text-indigo-700 font-medium">Roll Numbers Generated</p>
              <h2 className="text-2xl font-bold text-indigo-900 mt-1">{stats.withRoll}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-700 font-medium">Slips Published</p>
              <h2 className="text-2xl font-bold text-emerald-900 mt-1">{stats.published}</h2>
            </CardContent>
          </Card>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="flex gap-3 items-end flex-wrap">
            <TextField label="Search (Name / CNIC / Ref ID)" variant="outlined" size="small" name="search"
              value={filters.search} onChange={handleFilterChange} sx={{ flex: '1 1 220px', minWidth: 200 }} />
            <TextField label="Advertisement No" variant="outlined" size="small" name="advertisement_no"
              value={filters.advertisement_no} onChange={handleFilterChange} sx={{ width: 160 }} />
            <TextField label="Status" variant="outlined" size="small" name="status" select
              value={filters.status} onChange={handleFilterChange} sx={{ width: 150 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Shortlisted">Shortlisted</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
              <MenuItem value="Interview">Interview</MenuItem>
            </TextField>
            <TextField label="Roll Number" variant="outlined" size="small" name="generated" select
              value={filters.generated} onChange={handleFilterChange} sx={{ width: 160 }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="yes">Generated</MenuItem>
              <MenuItem value="no">Not Generated</MenuItem>
            </TextField>
            <TextField label="Exam City Preferences" variant="outlined" size="small" name="preferred_exam_city"
              value={filters.preferred_exam_city} onChange={handleFilterChange} sx={{ width: 200 }} />
            <Button variant="outline" size="md" onClick={handleClearFilters}
              className="h-[33.07px] w-[33.07px] min-w-[33.07px] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Clear Filters" aria-label="Clear Filters">
              <FilterX size={16} />
            </Button>
            <Button variant="outline" size="md" onClick={fetchApplications} disabled={loading}
              className="h-[33.07px] w-[33.07px] min-w-[33.07px] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Refresh List" aria-label="Refresh List">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

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
                    disabled={rows.filter(r => selectedIds.includes(r.id) && r.roll_number).length === 0}>
                    <Trash2 size={14} /> Delete Roll No Slip
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GRID */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-10 flex justify-center">
              <InlineLoader text="Loading applications..." variant="ring" size="lg" />
            </div>
          ) : rows.length === 0 && !loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Eye size={32} className="text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No applications found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                Applications will appear here once candidates apply through the candidate portal.
              </p>
            </div>
          ) : (
            <TooltipDataGrid
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              paginationMode="server"
              rowCount={total}
              paginationModel={paginationModel}
              onPaginationModelChange={setPaginationModel}
              pageSizeOptions={[15, 25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 15, page: 0 } } }}
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
