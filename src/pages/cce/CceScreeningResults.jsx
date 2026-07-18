import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { IconButton, Menu, MenuItem, TextField, ListItemText } from '@mui/material';
import {
  ShieldCheck,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock3,
  Send,
  EyeOff,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import CceScreeningApi from 'api/cceScreeningApi';
import { GRID_SX, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';

const DEFAULT_FILTERS = { search: '', status: '' };

/**
 * CCE Screening uses advertisement-level clubbing (clubbed_advertisement_ids)
 * returned by GET /cce/screening/advertisements — not the Results Module's
 * job-level clubbed-groups endpoint. This function collapses advertisements
 * that share a clubbed group into a single dropdown entry, identical in
 * behaviour to how the Results Module collapses job posts.
 *
 * Each returned entry has:
 *   designation    — combined job designations joined with ' & '
 *   advId          — hash_id of the anchor advertisement
 *   advIds         — all advertisement hash_ids in the group (for API calls)
 *   isClubbedGroup — true when more than one advertisement is in the group
 *   adv_number     — adv_number of the anchor advertisement
 */
const groupByClubbedAdvertisements = (advertisements) => {
  const seen = new Set();
  const entries = [];

  advertisements.forEach((adv) => {
    const advId = adv.hash_id || adv.id;
    if (seen.has(advId)) return;

    const siblingIds = Array.isArray(adv.clubbed_advertisement_ids)
      ? adv.clubbed_advertisement_ids.filter(Boolean)
      : [];

    if (siblingIds.length > 0) {
      // Clubbed group: collect this advertisement and all its siblings.
      const allAdvIds  = [advId, ...siblingIds];
      const siblingAdvs = siblingIds.map(sid =>
        advertisements.find(a => (a.hash_id || a.id) === sid)
      ).filter(Boolean);

      allAdvIds.forEach(id => seen.add(id));

      // Combined designation from all advertisements' job lists.
      const allJobs = [adv, ...siblingAdvs].flatMap(a =>
        (a.jobs || a.job_details || a.jobDetails || []).map(j => j.designation).filter(Boolean)
      );
      const designation = [...new Set(allJobs)].join(' & ') || adv.adv_number || advId;

      entries.push({
        id:             advId,
        hash_id:        advId,
        advId,
        advIds:         allAdvIds,
        designation,
        isClubbedGroup: true,
        adv_number:     adv.adv_number,
      });
    } else {
      // Individual advertisement — show its own jobs' designations.
      seen.add(advId);
      const jobs = adv.jobs || adv.job_details || adv.jobDetails || [];
      const designation = jobs.map(j => j.designation).filter(Boolean).join(' & ') || adv.adv_number || advId;

      entries.push({
        id:             advId,
        hash_id:        advId,
        advId,
        advIds:         [advId],
        designation,
        isClubbedGroup: false,
        adv_number:     adv.adv_number,
      });
    }
  });

  return entries;
};

const FILTER_CONFIG = [
  { name: 'search', label: 'Search (Name / CNIC / Roll No)', type: 'text', placeholder: 'Search by name, CNIC, or roll number' },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'pending', label: 'Pending' },
      { value: 'pass', label: 'Pass' },
      { value: 'fail', label: 'Fail' },
    ],
  },
];

const StatusPill = ({ status }) => {
  if (status === 'pass') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">PASS</span>;
  }
  if (status === 'fail') {
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">FAIL</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">PENDING</span>;
};

const CceScreeningResults = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [advertisementsLoading, setAdvertisementsLoading] = useState(true);
  const [advertisementIds, setAdvertisementIds] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState('');

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 15 });

  const [groupedJobs, setGroupedJobs] = useState([]);

  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    if (advertisementIds.length === 0) {
      toast.error('Select at least one advertisement');
      return;
    }
    setBusy(true);
    try {
      const { blob, filename } = await CceScreeningApi.downloadTemplate(advertisementIds);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded successfully');
    } catch (err) {
      toast.error(err?.message || 'Failed to download template');
    } finally {
      setBusy(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportMarks = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (advertisementIds.length === 0) {
      toast.error('Select at least one advertisement');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('advertisement_id', advertisementIds.join(','));

    setBusy(true);
    try {
      const res = await CceScreeningApi.importMarks(formData);
      toast.success(res?.message || 'Marks imported successfully');
      await loadResults();
    } catch (err) {
      if (err.errors && Array.isArray(err.errors.file)) {
        err.errors.file.forEach((errMsg) => {
          toast.error(errMsg, { duration: 6000 });
        });
      } else {
        toast.error(err?.message || 'Failed to import marks');
      }
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const [selectionModel, setSelectionModel] = useState([]);
  const selectedIds = useMemo(() => {
    if (!selectionModel) return [];
    if (Array.isArray(selectionModel)) return selectionModel;
    if (selectionModel.ids instanceof Set) return Array.from(selectionModel.ids);
    if (Array.isArray(selectionModel.ids)) return selectionModel.ids;
    if (selectionModel instanceof Set) return Array.from(selectionModel);
    return [];
  }, [selectionModel]);
  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.hash_id)),
    [rows, selectedIds]
  );

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const handleMenuOpen  = (e, row) => { setAnchorEl(e.currentTarget); setSelectedRow(row); };
  const handleMenuClose = () => { setAnchorEl(null); setSelectedRow(null); };

  // ── Resolve the advertisement ID(s) to query for a dropdown group entry.
  // For individual entries this is just [advId]; for clubbed groups it is
  // the full advIds list the grouper already computed.
  const resolveAdIdsForJob = (entry) => entry.advIds || [entry.advId || entry.id];

  // ── Advertisements eligible for CCE screening (roll numbers already
  // generated) — feeds the job post selector next to the header.
  // Clubbing is resolved from clubbed_advertisement_ids returned by the CCE
  // backend — a CCE-specific signal, separate from the Results Module's
  // job-level clubbed_group_id / RollNumberGenerationBatch mechanism.
  useEffect(() => {
    (async () => {
      setAdvertisementsLoading(true);
      try {
        const res = await CceScreeningApi.advertisements();
        const list = res?.data ?? [];
        const safeList = Array.isArray(list) ? list : [];
        setAdvertisements(safeList);

        // Collapse advertisements into grouped dropdown entries using the
        // clubbed_advertisement_ids field the CCE backend already provides.
        const groups = groupByClubbedAdvertisements(safeList);
        setGroupedJobs(groups);

        if (groups.length > 0) {
          const defaultEntry = groups[0];
          setSelectedJobId(defaultEntry.advId);
          setAdvertisementIds(resolveAdIdsForJob(defaultEntry));
        }
      } catch (err) {
        toast.error(err?.message || 'Failed to load advertisements');
      } finally {
        setAdvertisementsLoading(false);
      }
    })();
  }, []);

  // ── Screening candidates for the selected advertisement(s) ──────────────
  const loadResults = useCallback(async () => {
    if (advertisementIds.length === 0) return;
    setLoading(true);
    try {
      const res = await CceScreeningApi.list(advertisementIds, {
        status:   filters.status || undefined,
        search:   filters.search || undefined,
        per_page: paginationModel.pageSize,
        page:     paginationModel.page + 1,
      });
      const payload = res?.data ?? {};
      const list = payload.data ?? [];
      setRows(Array.isArray(list) ? list : []);
      setTotal(Number(payload.total ?? list.length ?? 0));
      setSelectionModel([]);
    } catch (err) {
      toast.error(err?.message || 'Failed to load screening results');
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [advertisementIds, filters, paginationModel]);

  useEffect(() => { loadResults(); }, [loadResults]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  // ── Row-level status change (used by the row menu) ──────────────────────
  const setRowStatus = async (row, status) => {
    setBusy(true);
    try {
      await CceScreeningApi.bulkSetStatus([row.hash_id], status);
      toast.success(`Marked as ${status}`);
      await loadResults();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkStatus = async (status) => {
    if (selectedIds.length === 0) { toast.error('Select at least one candidate'); return; }
    setBusy(true);
    try {
      await CceScreeningApi.bulkSetStatus(selectedIds, status);
      toast.success(`Marked ${selectedIds.length} candidate(s) as ${status}`);
      await loadResults();
    } catch (err) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (selectedIds.length === 0) { toast.error('Select at least one candidate'); return; }

    // A candidate must never see a screening result before it's decided —
    // pending (unassessed) rows are excluded from the publish call so they
    // can't accidentally go out half-finished.
    const publishableIds = selectedRows.filter((r) => r.status !== 'pending').map((r) => r.hash_id);
    const pendingCount   = selectedIds.length - publishableIds.length;

    if (publishableIds.length === 0) {
      toast.error('Mark pass/fail before publishing — pending results cannot be published');
      return;
    }

    const confirmed = await confirmDelete({
      title: 'Publish Screening Results',
      message: `Publish results for ${publishableIds.length} candidate(s)? This locks their status and notifies them immediately.`,
      warning: 'This action cannot be undone.',
      confirmLabel: 'Publish',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await CceScreeningApi.publish(publishableIds);
      toast.success(res?.message || 'Screening results published');
      if (pendingCount > 0) {
        toast.error(`${pendingCount} pending result(s) were skipped — mark pass/fail first`);
      }
      await loadResults();
    } catch (err) {
      toast.error(err?.message || 'Failed to publish screening results');
    } finally {
      setBusy(false);
    }
  };

  const publishRow = async (row) => {
    if (row.published_at) return;
    if (row.status === 'pending') {
      toast.error('Mark pass/fail before publishing this result');
      return;
    }
    const confirmed = await confirmDelete({
      title: 'Publish Screening Result',
      message: `Publish the screening result for ${row.candidate_name}? This locks their status and notifies them immediately.`,
      warning: 'This action cannot be undone.',
      confirmLabel: 'Publish',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await CceScreeningApi.publish([row.hash_id]);
      toast.success(res?.message || 'Screening result published');
      await loadResults();
    } catch (err) {
      toast.error(err?.message || 'Failed to publish screening result');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkUnpublish = async () => {
    const publishedIds = selectedRows.filter((r) => r.published_at).map((r) => r.hash_id);
    if (publishedIds.length === 0) {
      toast.error('None of the selected candidates have a published result to unpublish');
      return;
    }

    const confirmed = await confirmDelete({
      title: 'Unpublish Screening Results',
      message: `Unpublish results for ${publishedIds.length} candidate(s)? They will no longer be able to see this result until it's republished.`,
      warning: 'The candidate immediately loses access to this result.',
      confirmLabel: 'Unpublish',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await CceScreeningApi.unpublish(publishedIds);
      toast.success(res?.message || 'Screening results unpublished');
      await loadResults();
    } catch (err) {
      toast.error(err?.message || 'Failed to unpublish screening results');
    } finally {
      setBusy(false);
    }
  };

  const unpublishRow = async (row) => {
    if (!row.published_at) return;
    const confirmed = await confirmDelete({
      title: 'Unpublish Screening Result',
      message: `Unpublish the screening result for ${row.candidate_name}? They will no longer be able to see this result until it's republished.`,
      warning: 'The candidate immediately loses access to this result.',
      confirmLabel: 'Unpublish',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!confirmed) return;

    setBusy(true);
    try {
      const res = await CceScreeningApi.unpublish([row.hash_id]);
      toast.success(res?.message || 'Screening result unpublished');
      await loadResults();
    } catch (err) {
      toast.error(err?.message || 'Failed to unpublish screening result');
    } finally {
      setBusy(false);
    }
  };

  const selectedPublishedCount = selectedRows.filter((r) => r.published_at).length;

  // ── Stats (current page) ─────────────────────────────────────────────────
  const stats = useMemo(() => ({
    pending:   rows.filter((r) => r.status === 'pending').length,
    pass:      rows.filter((r) => r.status === 'pass').length,
    fail:      rows.filter((r) => r.status === 'fail').length,
    published: rows.filter((r) => r.published_at).length,
  }), [rows]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    { field: 'candidate_name', headerName: 'Candidate', minWidth: 180, flex: 1.1 },
    { field: 'candidate_cnic', headerName: 'CNIC', minWidth: 140, flex: 0.8 },
    { field: 'application_number', headerName: 'Application #', minWidth: 150, flex: 0.9 },
    {
      field: 'roll_number',
      headerName: 'Roll Number',
      minWidth: 140,
      flex: 0.9,
      renderCell: (p) => p.value
        ? <span className="font-mono font-bold text-indigo-700">{p.value}</span>
        : <span className="text-slate-400 text-xs">—</span>,
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 110,
      flex: 0.6,
      renderCell: (p) => <StatusPill status={p.value} />,
    },
    {
      field: 'published_at',
      headerName: 'Published',
      minWidth: 190,
      flex: 1.0,
      renderCell: (p) => p.value
        ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{new Date(p.value).toLocaleString()}</span>
        : <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Not Published</span>,
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
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg"><ShieldCheck size={22} className="text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">CCE Screening Results</h1>
              <p className="text-sm text-slate-500 mt-1">Set pass/fail for CCE screening candidates and publish results to the candidate portal.</p>
            </div>
          </div>
          {groupedJobs.length > 0 && (
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <TextField
                select
                size="small"
                label="Job Post / Exam"
                value={selectedJobId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedJobId(val);
                  const matchedEntry = groupedJobs.find(j => (j.advId || j.id) === val);
                  if (matchedEntry) {
                    setAdvertisementIds(resolveAdIdsForJob(matchedEntry));
                  }
                  setPaginationModel((prev) => ({ ...prev, page: 0 }));
                }}
                sx={{ minWidth: 280, backgroundColor: 'white' }}
              >
                {groupedJobs.map((entry) => (
                  <MenuItem key={entry.advId} value={entry.advId}>
                    <ListItemText
                      primary={entry.designation}
                      secondary={entry.isClubbedGroup ? 'Clubbed Job Post Group' : `Adv: ${entry.adv_number || 'N/A'}`}
                    />
                  </MenuItem>
                ))}
              </TextField>

              <div className="flex gap-2">
                <Button onClick={handleDownloadTemplate} variant="outline" className="flex items-center gap-2" disabled={busy}>
                  <Download size={16} /> Download Template
                </Button>
                <Button onClick={handleImportClick} variant="outline" className="flex items-center gap-2" disabled={busy}>
                  <Download size={16} className="rotate-180" /> Import Marks
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleImportMarks}
                  className="hidden"
                />
              </div>
            </div>
          )}
        </div>

        {advertisementsLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-10 flex justify-center">
            <InlineLoader text="Loading advertisements..." variant="ring" size="lg" />
          </div>
        ) : advertisements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-16 flex flex-col items-center justify-center text-center">
            <div className="p-4 bg-slate-100 rounded-full mb-4">
              <ShieldCheck size={32} className="text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-700">No CCE Screening Roll Numbers Yet</p>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">No CCE Screening roll number slips have been generated yet.</p>
          </div>
        ) : (
          <>
            {/* STATS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 font-medium">Pending</p>
                  <h2 className="text-2xl font-bold text-slate-900 mt-1">{stats.pending}</h2>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
                <CardContent className="p-4">
                  <p className="text-xs text-emerald-700 font-medium">Pass</p>
                  <h2 className="text-2xl font-bold text-emerald-900 mt-1">{stats.pass}</h2>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200">
                <CardContent className="p-4">
                  <p className="text-xs text-red-700 font-medium">Fail</p>
                  <h2 className="text-2xl font-bold text-red-900 mt-1">{stats.fail}</h2>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <CardContent className="p-4">
                  <p className="text-xs text-blue-700 font-medium">Published</p>
                  <h2 className="text-2xl font-bold text-blue-900 mt-1">{stats.published}</h2>
                </CardContent>
              </Card>
            </div>

            {/* FILTERS */}
            <AdvancedFilter
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              filterConfig={FILTER_CONFIG}
              title="Filter Screening Candidates"
            />

            {/* BULK BAR */}
            {selectedIds.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-800 font-medium">
                    {selectedIds.length} candidate{selectedIds.length === 1 ? '' : 's'} selected
                  </span>
                  <div className="flex gap-2">
                    <Button onClick={handlePublish} size="sm" disabled={busy} className="flex items-center gap-2">
                      <Send size={14} /> Publish Selected
                    </Button>
                    {selectedPublishedCount > 0 && (
                      <Button onClick={handleBulkUnpublish} variant="outline" size="sm" disabled={busy}
                        className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                        <EyeOff size={14} /> Unpublish Selected
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
                  <InlineLoader text="Loading screening results..." variant="ring" size="lg" />
                </div>
              ) : rows.length === 0 && !loading ? (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                  <div className="p-4 bg-slate-100 rounded-full mb-4">
                    <ShieldCheck size={32} className="text-slate-400" />
                  </div>
                  <p className="text-base font-semibold text-slate-700">No screening candidates found</p>
                  <p className="text-sm text-slate-400 mt-1 max-w-sm">
                    {filters.search || filters.status
                      ? 'No candidates match the current filters.'
                      : 'CCE candidates with a generated roll number will appear here automatically.'}
                  </p>
                </div>
              ) : (
                <TooltipDataGrid
                  rows={rows}
                  columns={columns}
                  getRowId={(r) => r.hash_id}
                  paginationMode="server"
                  rowCount={total}
                  paginationModel={paginationModel}
                  onPaginationModelChange={setPaginationModel}
                  pageSizeOptions={GRID_PAGE_SIZE_OPTIONS}
                  checkboxSelection
                  onRowSelectionModelChange={(s) => setSelectionModel(s)}
                  rowSelectionModel={selectionModel}
                  disableRowSelectionOnClick
                  autoHeight
                  loading={loading}
                  sx={GRID_SX}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ROW MENU */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {!selectedRow?.published_at && (
          <MenuItem disabled={selectedRow?.status === 'pending'}
            onClick={() => { const r = selectedRow; handleMenuClose(); publishRow(r); }}>
            <Send size={16} style={{ marginRight: '8px' }} className="text-indigo-600" /> Publish Result
          </MenuItem>
        )}
        {selectedRow?.published_at && (
          <MenuItem onClick={() => { const r = selectedRow; handleMenuClose(); unpublishRow(r); }}>
            <EyeOff size={16} style={{ marginRight: '8px' }} className="text-amber-600" /> Unpublish Result
          </MenuItem>
        )}
      </Menu>
    </div>
  );
};

export default CceScreeningResults;
