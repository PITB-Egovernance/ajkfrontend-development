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
  FileText,
  RefreshCw,
  MoreVertical,
  Download,
  Trash2,
  Pencil,
  Send,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import RollNumberApi from 'api/rollNumberApi';
import { formatDate } from 'utils/dateUtils';
import { hasPermission } from 'utils/permissions';

const PERM = 'roll_number.roll_number_generation';

// Debounce delay for free-text filter inputs (search / preferred exam city) —
// avoids firing an API request on every keystroke.
const FILTER_DEBOUNCE_MS = 400;

const DEFAULT_FILTERS = {
  search: '',
  advertisement_no: '',
  preferred_exam_city: '',
  exam_center_id: '',
  payment_status: '',
  working_state: '',
};

const WORKING_STATE_OPTIONS = [
  { value: 'generated', label: 'Roll No Generated (Not Published)' },
  { value: 'published', label: 'Published' },
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

  const [allRows,         setAllRows]          = useState([]); // current page only — server owns filtering/pagination
  const [totalCount,      setTotalCount]       = useState(0);
  const [rowsCache,       setRowsCache]        = useState({}); // application_number -> row, accumulated across pages so bulk actions still work after paging away
  const [stats,           setStats]            = useState({ total: 0, unique: 0, generated: 0, published: 0, centers: 0 });
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
  const selectedRows = useMemo(
    () => selectedIds.map((id) => rowsCache[id]).filter(Boolean),
    [selectedIds, rowsCache]
  );

  const [filters,          setFilters]          = useState(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters]  = useState(DEFAULT_FILTERS);
  const [centers,          setCenters]           = useState([]);
  const [advertisements,   setAdvertisements]    = useState([]);

  const [anchorEl,    setAnchorEl]    = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);

  // Debounce free-text inputs (search / preferred exam city) so we don't hit
  // the API on every keystroke — dropdowns apply through the same pipeline,
  // so they're briefly debounced too, which is an acceptable trade-off for
  // one simple, consistent path.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters]);

  // Reset to page 1 whenever the applied filters change.
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [debouncedFilters]);

  // ── Exam centers (for the Exam Center filter dropdown) ─────────────────
  useEffect(() => {
    (async () => {
      try {
        const r    = await RollNumberApi.getExamCenters(500);
        const list = r.data?.data ?? r.data ?? [];
        setCenters(Array.isArray(list) ? list : []);
      } catch { /* silent — filter falls back to an empty options list */ }
    })();
  }, []);

  // ── Advertisements (for the Advertisement No filter dropdown) ──────────
  useEffect(() => {
    (async () => {
      try {
        const r    = await RollNumberApi.getAdvertisementsWithJobs(200);
        const list = r.data?.data ?? r.data ?? [];
        setAdvertisements(Array.isArray(list) ? list : []);
      } catch { /* silent — filter falls back to an empty options list */ }
    })();
  }, []);

  // Filter definitions built from real, complete lists (not just the current
  // page) so Exam Center / Advertisement No only ever offer values that
  // actually exist, and dropdown values are the raw ids the backend expects.
  const filterConfig = useMemo(() => {
    const advertisementOptions = Array.from(new Set(advertisements.map((a) => a.adv_number).filter(Boolean)))
      .sort()
      .map((value) => ({ value, label: `Advertisement ${value}` }));

    const centerOptions = centers
      .filter((c) => c.id != null)
      .map((c) => ({ value: String(c.id), label: `${c.name}${c.city ? ` (${c.city})` : ''}` }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      { name: 'search', label: 'Search (Name / CNIC / Ref ID / Roll No)', type: 'text', placeholder: 'Search by name, CNIC, Ref ID, or Roll No' },
      { name: 'advertisement_no', label: 'Advertisement No', type: 'select', options: advertisementOptions },
      { name: 'exam_center_id', label: 'Exam Center', type: 'select', options: centerOptions },
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
      { name: 'working_state', label: 'Slip Status', type: 'select', options: WORKING_STATE_OPTIONS },
    ];
  }, [advertisements, centers]);

  const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  // ── Data: search/filter/sort/paginate all happen server-side — this page
  // just requests the current page for the active filters and renders it. ──
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const result = await RollNumberApi.getShortlisted({
        per_page:            paginationModel.pageSize,
        page:                paginationModel.page + 1,
        search:              debouncedFilters.search,
        advertisement_no:    debouncedFilters.advertisement_no,
        payment_status:      debouncedFilters.payment_status,
        exam_center_id:      debouncedFilters.exam_center_id,
        preferred_exam_city: debouncedFilters.preferred_exam_city,
        slip_status:         debouncedFilters.working_state,
        has_roll_number:     1, // only candidates whose slip has been generated belong on this list
      });

      const payload = result?.data ?? {};
      const items   = Array.isArray(payload.data) ? payload.data : [];

      const mapped = items
        .map((item) => {
          const rollStr = typeof item.roll_number === 'string' ? item.roll_number
                        : (item.roll_number?.roll_number || null);
          return {
            id:                    item.application_number,
            application_number:   item.application_number,
            applicant_name:        item.candidate_name || 'N/A',
            cnic:                  item.candidate_cnic || 'N/A',
            job_title:             item.job_title || 'N/A',
            advertisement_no:      item.advertisement_no || 'N/A',
            applied_at:            item.applied_at ? formatDate(item.applied_at) : 'N/A',
            payment_status:        item.payment_status || 'N/A',
            preferred_exam_cities: (item.preferred_exam_cities || [])
              .map((c) => (typeof c === 'string' ? c : (c?.city || c?.name || ''))).filter(Boolean),
            roll_number:           rollStr,
            exam_center:           item.exam_center || null,
            exam_center_id:        item.exam_center_id || null,
            exam_city:             item.exam_city || null,
            published_at:          item.published_at || null,
            advertisement_hash_id: item.advertisement_hash_id || null,
            working_state:         item.published_at ? 'published' : 'generated',
          };
        })
        // Defensive guard on top of the has_roll_number=1 request param above —
        // a row with no roll number never renders on this screen, even if the
        // backend being hit hasn't picked up that filter yet.
        .filter((row) => !!row.roll_number);

      setAllRows(mapped);
      setTotalCount(payload.total ?? mapped.length);
      if (payload.stats) {
        setStats({
          total:     payload.stats.total ?? 0,
          unique:    payload.stats.unique_candidates ?? 0,
          generated: payload.stats.generated ?? 0,
          published: payload.stats.published ?? 0,
          centers:   payload.stats.centers ?? 0,
        });
      }
      setRowsCache((prev) => {
        const next = { ...prev };
        mapped.forEach((r) => { next[r.id] = r; });
        return next;
      });
    } catch (err) {
      toast.error(err?.message || 'Failed to load roll number slips');
      setAllRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [paginationModel, debouncedFilters]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ── Filters ─────────────────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedFilters(DEFAULT_FILTERS); // apply immediately, don't wait out the debounce
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

    const rowsWithRoll = selectedRows.filter(r => r.roll_number);
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

  // ── Publish / Unpublish ─────────────────────────────────────────────────
  // Slips are grouped by advertisement (the publish/unpublish endpoint is
  // scoped per-advertisement) so a selection spanning multiple advertisements
  // still works in one action.
  const runPublishAction = async (rows, action) => {
    const byAd = {};
    rows.forEach((r) => {
      if (!r.advertisement_hash_id) return;
      (byAd[r.advertisement_hash_id] ||= []).push(r.application_number);
    });
    const adIds = Object.keys(byAd);
    if (adIds.length === 0) {
      throw new Error('Missing advertisement reference for the selected slip(s)');
    }
    const apiFn = action === 'publish' ? RollNumberApi.publishSlips : RollNumberApi.unpublishSlips;
    const results = await Promise.all(adIds.map((adId) => apiFn(adId, byAd[adId])));
    return results.reduce((sum, r) => sum + (r.data?.published ?? r.data?.unpublished ?? 0), 0);
  };

  const bulkPublishSlips = async () => {
    if (selectedIds.length === 0) return;
    const rows = selectedRows.filter((r) => r.roll_number && !r.published_at);
    if (rows.length === 0) {
      toast.error('None of the selected candidates have an unpublished slip to publish');
      return;
    }

    const ok = await confirmDelete({
      title:       'Publish Roll Number Slips',
      message:     `Publish roll number slips for ${rows.length} selected candidate${rows.length === 1 ? '' : 's'}? They will become visible to candidates immediately.`,
      identifier:  `${rows.length} slips`,
      warning:     'Candidates will be able to view and download these slips right away.',
      confirmLabel: 'Publish',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;

    const tid = toast.loading(`Publishing ${rows.length} slip${rows.length === 1 ? '' : 's'}…`);
    try {
      const count = await runPublishAction(rows, 'publish');
      toast.dismiss(tid);
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} published successfully`);
      setSelectionModel([]);
      fetchApplications();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to publish slips');
    }
  };

  const bulkUnpublishSlips = async () => {
    if (selectedIds.length === 0) return;
    const rows = selectedRows.filter((r) => r.published_at);
    if (rows.length === 0) {
      toast.error('None of the selected candidates have a published slip to unpublish');
      return;
    }

    const ok = await confirmDelete({
      title:       'Unpublish Roll Number Slips',
      message:     `Unpublish roll number slips for ${rows.length} selected candidate${rows.length === 1 ? '' : 's'}? They will no longer be visible to candidates.`,
      identifier:  `${rows.length} slips`,
      warning:     'Candidates will immediately lose access to view/download these slips.',
      confirmLabel: 'Unpublish',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!ok) return;

    const tid = toast.loading(`Unpublishing ${rows.length} slip${rows.length === 1 ? '' : 's'}…`);
    try {
      const count = await runPublishAction(rows, 'unpublish');
      toast.dismiss(tid);
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} unpublished successfully`);
      setSelectionModel([]);
      fetchApplications();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to unpublish slips');
    }
  };

  const publishRow = async (row) => {
    if (!row?.roll_number || row.published_at) return;
    const ok = await confirmDelete({
      title:       'Publish Roll Number Slip',
      message:     `Publish the roll number slip for ${row.applicant_name || row.application_number}? It will become visible to the candidate immediately.`,
      identifier:  row.application_number,
      warning:     'The candidate will be able to view and download this slip right away.',
      confirmLabel: 'Publish',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;

    const tid = toast.loading('Publishing slip…');
    try {
      await runPublishAction([row], 'publish');
      toast.dismiss(tid);
      toast.success('Roll number slip published successfully');
      fetchApplications();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to publish slip');
    }
  };

  const unpublishRow = async (row) => {
    if (!row?.published_at) return;
    const ok = await confirmDelete({
      title:       'Unpublish Roll Number Slip',
      message:     `Unpublish the roll number slip for ${row.applicant_name || row.application_number}? It will no longer be visible to the candidate.`,
      identifier:  row.application_number,
      warning:     'The candidate will immediately lose access to view/download this slip.',
      confirmLabel: 'Unpublish',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!ok) return;

    const tid = toast.loading('Unpublishing slip…');
    try {
      await runPublishAction([row], 'unpublish');
      toast.dismiss(tid);
      toast.success('Roll number slip unpublished successfully');
      fetchApplications();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to unpublish slip');
    }
  };

  // ── Row menu ────────────────────────────────────────────────────────────
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  const handleView = () => {
    if (selectedRow) navigate(`/dashboard/applications/${selectedRow.application_number}`);
    handleMenuClose();
  };


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
      field: 'working_state',
      headerName: 'Slip Status',
      minWidth: 150,
      flex: 0.7,
      renderCell: (p) => p.value === 'published'
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Published</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Roll No Generated</span>,
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
          <Button variant="outline" size="md" onClick={fetchApplications} disabled={loading}
            className="h-10 w-10 min-w-[2.5rem] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            title="Refresh List" aria-label="Refresh List">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
            <CardContent className="p-4">
              <p className="text-xs text-indigo-700 font-medium">Unique Candidates</p>
              <h2 className="text-2xl font-bold text-indigo-900 mt-1">{stats.unique}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200">
            <CardContent className="p-4">
              <p className="text-xs text-violet-700 font-medium">Total Slips</p>
              <h2 className="text-2xl font-bold text-violet-900 mt-1">{stats.total}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200">
            <CardContent className="p-4">
              <p className="text-xs text-amber-700 font-medium">Roll No Generated</p>
              <h2 className="text-2xl font-bold text-amber-900 mt-1">{stats.generated}</h2>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4">
              <p className="text-xs text-emerald-700 font-medium">Published</p>
              <h2 className="text-2xl font-bold text-emerald-900 mt-1">{stats.published}</h2>
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
          filterConfig={filterConfig}
          title="Filter Roll Number Slips"
        />

        {/* BULK BAR */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-emerald-800 font-medium">
                {selectedIds.length} candidate{selectedIds.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                {canEdit && (
                  <Button onClick={bulkPublishSlips} variant="outline" size="sm"
                    className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={selectedRows.filter(r => r.roll_number && !r.published_at).length === 0}>
                    <Send size={14} /> Publish Selected
                  </Button>
                )}
                {canEdit && (
                  <Button onClick={bulkUnpublishSlips} variant="outline" size="sm"
                    className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                    disabled={selectedRows.filter(r => r.published_at).length === 0}>
                    <EyeOff size={14} /> Unpublish Selected
                  </Button>
                )}
                {canDelete && (
                  <Button onClick={bulkDeleteSlips} variant="outline" size="sm"
                    className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                    disabled={selectedRows.filter(r => r.roll_number).length === 0}>
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
          ) : allRows.length === 0 && !loading ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Eye size={32} className="text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-700">No roll number slips found</p>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">
                {hasActiveFilters
                  ? 'No slips match the current filters.'
                  : 'Roll number slips will appear here once they are generated through the exam flow.'}
              </p>
            </div>
          ) : (
            <TooltipDataGrid
              rows={allRows}
              columns={columns}
              getRowId={(r) => r.id}
              paginationMode="server"
              rowCount={totalCount}
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
        <MenuItem key="view-slip"
          onClick={() => { const row = selectedRow; handleMenuClose(); if (row) navigate(`/dashboard/roll-numbers/slip/${encodeURIComponent(row.roll_number)}`); }}
          disabled={!selectedRow?.roll_number}>
          <FileText size={16} style={{ marginRight: '8px' }} className="text-emerald-600" /> View Slip
        </MenuItem>
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
        {canEdit && !selectedRow?.published_at && (
          <MenuItem key="publish" onClick={() => { const row = selectedRow; handleMenuClose(); publishRow(row); }}
            disabled={!selectedRow?.roll_number}>
            <Send size={16} style={{ marginRight: '8px' }} className="text-emerald-600" /> Publish Slip
          </MenuItem>
        )}
        {canEdit && selectedRow?.published_at && (
          <MenuItem key="unpublish" onClick={() => { const row = selectedRow; handleMenuClose(); unpublishRow(row); }}>
            <EyeOff size={16} style={{ marginRight: '8px' }} className="text-amber-600" /> Unpublish Slip
          </MenuItem>
        )}
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
