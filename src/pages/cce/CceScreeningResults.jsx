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
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import CceScreeningApi from 'api/cceScreeningApi';
import { GRID_SX, GRID_PAGE_SIZE_OPTIONS } from 'utils/gridStyles';
import { groupByClubbedAdvertisements } from 'utils/cceClubbing';

const DEFAULT_FILTERS = { search: '', status: '' };

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
  const selectedEntry = useMemo(
    () => groupedJobs.find((j) => (j.advId || j.id) === selectedJobId) || null,
    [groupedJobs, selectedJobId]
  );

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
          toast.error(errMsg);
        });
      } else {
        toast.error(err?.message || 'Failed to import marks');
      }
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  // Two-step: a normal confirm first; if the backend reports candidates
  // already submitted a subject selection off these results, escalate to a
  // second, more explicit confirm before retrying with force — never
  // silently cascades into deleting subject selections/date sheets without
  // the admin seeing exactly what that means first.
  const handleDeleteResults = async () => {
    if (advertisementIds.length === 0) {
      toast.error('Select at least one advertisement');
      return;
    }
    const ok = await confirmDelete({
      title: 'Delete Screening Results',
      message: `Permanently delete all CCE screening results for "${selectedEntry?.designation || 'this advertisement'}"? Marks would need to be re-imported from scratch.`,
      warning: 'This cannot be undone.',
      confirmLabel: 'Delete Results',
    });
    if (!ok) return;

    setBusy(true);
    try {
      const res = await CceScreeningApi.deleteResults(advertisementIds);
      toast.success(res?.message || 'Screening results deleted');
      await loadResults();
    } catch (err) {
      const alreadySelected = err?.status === 422 && /subject selection/i.test(err?.message || '');
      if (!alreadySelected) {
        toast.error(err?.message || 'Failed to delete screening results');
        setBusy(false);
        return;
      }

      const forceOk = await confirmDelete({
        title: 'Candidates Already Submitted Subject Selection',
        message: err.message,
        warning: 'Proceeding also permanently deletes those subject selections and any scheduled written-exam date sheets.',
        confirmLabel: 'Delete Everything',
      });
      if (!forceOk) { setBusy(false); return; }

      try {
        const res2 = await CceScreeningApi.deleteResults(advertisementIds, true);
        toast.success(res2?.message || 'Screening results deleted');
        await loadResults();
      } catch (err2) {
        toast.error(err2?.message || 'Failed to delete screening results');
      }
    } finally {
      setBusy(false);
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

  // "Select all" on the grid only ever selects the currently-loaded page —
  // the grid is server-paginated, so it has no way to know about rows on
  // other pages. These are dedicated actions that find every matching
  // result across ALL pages (respecting the active advertisement + filters)
  // and publish/unpublish them in one go, instead of being limited to
  // whatever page happens to be on screen.
  const publishAllResults = async () => {
    if (advertisementIds.length === 0) return;
    const findingTid = toast.loading('Finding all publishable results…');
    let publishable;
    try {
      const res = await CceScreeningApi.list(advertisementIds, {
        status:   filters.status || undefined,
        search:   filters.search || undefined,
        per_page: 5000,
        page:     1,
      });
      const list = res?.data?.data ?? [];
      publishable = (Array.isArray(list) ? list : [])
        .filter((r) => r.status !== 'pending' && !r.published_at)
        .map((r) => r.hash_id);
    } catch (err) {
      toast.dismiss(findingTid);
      toast.error(err?.message || 'Failed to load screening results');
      return;
    }
    toast.dismiss(findingTid);

    if (publishable.length === 0) {
      toast.error('No publishable (pass/fail, not yet published) results found matching the current filters');
      return;
    }

    const confirmed = await confirmDelete({
      title: 'Publish All Screening Results',
      message: `Publish results for all ${publishable.length} publishable candidate${publishable.length === 1 ? '' : 's'} matching the current filters — not just the ones selected? This locks their status and notifies them immediately.`,
      warning: 'This action cannot be undone.',
      confirmLabel: 'Publish All',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!confirmed) return;

    setBusy(true);
    const tid = toast.loading(`Publishing ${publishable.length} result${publishable.length === 1 ? '' : 's'}…`);
    try {
      const res = await CceScreeningApi.publish(publishable);
      toast.dismiss(tid);
      toast.success(res?.message || 'Screening results published');
      setSelectionModel([]);
      await loadResults();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to publish screening results');
    } finally {
      setBusy(false);
    }
  };

  const unpublishAllResults = async () => {
    if (advertisementIds.length === 0) return;
    const findingTid = toast.loading('Finding all published results…');
    let published;
    try {
      const res = await CceScreeningApi.list(advertisementIds, {
        status:   filters.status || undefined,
        search:   filters.search || undefined,
        per_page: 5000,
        page:     1,
      });
      const list = res?.data?.data ?? [];
      published = (Array.isArray(list) ? list : [])
        .filter((r) => !!r.published_at)
        .map((r) => r.hash_id);
    } catch (err) {
      toast.dismiss(findingTid);
      toast.error(err?.message || 'Failed to load screening results');
      return;
    }
    toast.dismiss(findingTid);

    if (published.length === 0) {
      toast.error('No published results found matching the current filters');
      return;
    }

    const confirmed = await confirmDelete({
      title: 'Unpublish All Screening Results',
      message: `Unpublish results for all ${published.length} published candidate${published.length === 1 ? '' : 's'} matching the current filters — not just the ones selected? They will no longer be able to see this result until it's republished.`,
      warning: 'Those candidates immediately lose access to this result.',
      confirmLabel: 'Unpublish All',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!confirmed) return;

    setBusy(true);
    const tid = toast.loading(`Unpublishing ${published.length} result${published.length === 1 ? '' : 's'}…`);
    try {
      const res = await CceScreeningApi.unpublish(published);
      toast.dismiss(tid);
      toast.success(res?.message || 'Screening results unpublished');
      setSelectionModel([]);
      await loadResults();
    } catch (err) {
      toast.dismiss(tid);
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
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0"><ShieldCheck size={22} className="text-emerald-700" /></div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">CCE Screening Results</h1>
              <p className="text-sm text-slate-500 mt-1">Set pass/fail for CCE screening candidates and publish results to the candidate portal.</p>
            </div>
          </div>
          {groupedJobs.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center">
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
                sx={{
                  minWidth: 280,
                  maxWidth: 380,
                  backgroundColor: 'white',
                }}
                SelectProps={{
                  renderValue: (val) => {
                    const entry = groupedJobs.find(j => (j.advId || j.id) === val);
                    return (
                      <span
                        title={entry?.designation || ''}
                        style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {entry?.designation || ''}
                      </span>
                    );
                  },
                }}
              >
                {groupedJobs.map((entry) => (
                  <MenuItem key={entry.advId} value={entry.advId} title={entry.designation}>
                    <ListItemText
                      primary={entry.designation}
                      secondary={entry.isClubbedGroup ? 'Clubbed Job Post Group' : `Adv: ${entry.adv_number || 'N/A'}`}
                      primaryTypographyProps={{ noWrap: true, sx: { maxWidth: 340 } }}
                    />
                  </MenuItem>
                ))}
              </TextField>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleDownloadTemplate} variant="outline" className="flex items-center gap-2" disabled={busy}>
                  <Download size={16} /> Download Template
                </Button>
                <Button onClick={handleImportClick} variant="outline" className="flex items-center gap-2" disabled={busy}>
                  <Download size={16} className="rotate-180" /> Import Marks
                </Button>
                <Button onClick={handleDeleteResults} variant="outline" className="flex items-center gap-2 border-rose-300 text-rose-600 hover:bg-rose-50" disabled={busy}>
                  <Trash2 size={16} /> Delete Results
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

        {/* Full, non-truncated post list for the selected job/exam — the
            dropdown above truncates for layout, this always shows everything. */}
        {selectedEntry && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {selectedEntry.isClubbedGroup ? 'Clubbed Job Posts' : 'Job Post'}
            </p>
            <p className="text-sm font-medium text-emerald-900 mt-1 break-words">
              {selectedEntry.designation}
            </p>
          </div>
        )}

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

            {/* ACTION BAR — always visible so "Publish/Unpublish Selected" (acts only
                on the checked rows) and "Publish/Unpublish ALL" (acts on every
                matching result across every page) are never mistaken for each other. */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-emerald-800 font-medium">
                  {selectedIds.length > 0
                    ? `${selectedIds.length} candidate${selectedIds.length === 1 ? '' : 's'} selected on this page`
                    : 'No candidates selected on this page'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedIds.length > 0 && (
                    <>
                      <Button onClick={handlePublish} variant="outline" size="sm" disabled={busy}
                        className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                        <Send size={14} /> Publish Selected ({selectedIds.length})
                      </Button>
                      {selectedPublishedCount > 0 && (
                        <Button onClick={handleBulkUnpublish} variant="outline" size="sm" disabled={busy}
                          className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                          <EyeOff size={14} /> Unpublish Selected ({selectedPublishedCount})
                        </Button>
                      )}
                      <span className="mx-1 h-6 w-px bg-emerald-200" aria-hidden="true" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={unpublishAllResults}
                    disabled={busy || advertisementIds.length === 0}
                    title="Unpublishes every published result across all pages, not just what's selected"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-sm"
                  >
                    <EyeOff size={14} /> Unpublish ALL Published
                  </button>
                  <Button
                    onClick={publishAllResults}
                    variant="primary"
                    size="sm"
                    disabled={busy || advertisementIds.length === 0}
                    className="gap-2"
                    title="Publishes every publishable (pass/fail) result across all pages, not just what's selected"
                  >
                    <Send size={14} /> Publish ALL
                  </Button>
                </div>
              </div>
            </div>

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
