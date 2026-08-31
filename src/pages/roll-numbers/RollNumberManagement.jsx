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

// Single merged filter group — previously split across two separate filter
// bars (free-text/dropdown filters + the Advertisement -> Department -> Post
// cascade). Combined into one bar/state so there's one Search/Reset action
// instead of two, without dropping any of the individual filters.
const DEFAULT_FILTERS = {
  search: '',
  exam_center_id: '',
  adv_number: '',
  department_hash_id: '',
  job_detail_hash_id: '',
};

// adv_number sometimes already reads "Advertisement 1-26" and sometimes just
// "1-26" depending on how it was entered — only prefix it when it's missing,
// so the dropdown never shows "Advertisement Advertisement 1-26".
const formatAdvertisementLabel = (value) => {
  const str = String(value ?? '');
  return /^advertisement\b/i.test(str) ? str : `Advertisement ${str}`;
};

// A job_detail's `department` relation object is null whenever the record
// still uses the legacy raw-text department column (department_id unset) —
// the backend resolves that case into `department_label` instead (see
// JobDetail::getDepartmentLabelAttribute), so fall back to it here too, or
// the Department dropdown silently drops every legacy-tagged post.
const getDeptKey   = (jd) => jd?.department?.hash_id || jd?.department_label || null;
const getDeptLabel = (jd) => jd?.department?.department_name || jd?.department?.name || jd?.department_label || 'Unassigned Department';

// Slip Status is now driven by the Published/Unpublished tabs (not a filter
// dropdown) — see `activeTab` below.
const TABS = [
  { id: 'unpublished', label: 'Unpublished Slips', slipStatus: 'generated' },
  { id: 'published', label: 'Published Slips', slipStatus: 'published' },
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

// The live backend cascades publish/unpublish/delete to sibling rows under
// OTHER advertisements (clubbed posts), which can intermittently deadlock
// against a concurrent action touching an overlapping advertisement and
// return a transient 500 — retrying once covers that without the admin
// having to notice the failure and click again themselves.
const withRetry = async (fn, retries = 1, delayMs = 400) => {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return withRetry(fn, retries - 1, delayMs);
  }
};

// fixedTab locks the page to only ever show 'published' or 'unpublished' slips
// and hides the in-page tab switcher — used by the two dedicated pages
// (PublishedRollSlips / UnpublishedRollSlips) that now live at their own
// routes instead of one combined page with a toggle.
const RollNumberManagement = ({ fixedTab } = {}) => {
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
  const [activeTab,       setActiveTab]        = useState(fixedTab || 'unpublished');
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

  // Reset to page 1 whenever the applied filters or the active tab change.
  useEffect(() => {
    setPaginationModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
  }, [debouncedFilters, activeTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectionModel([]);
  };

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

  // ── Advertisement -> Department -> Post cascade ─────────────────────────
  // Built entirely client-side from `advertisements` (already fetched above
  // via getAdvertisementsWithJobs, which nests job_details[].department per
  // advertisement) — no extra API calls needed. Each dropdown's options are
  // narrowed by whatever parent(s) are currently selected; an unset filter
  // is treated as "all", per the requested hierarchy. Computed ahead of
  // filterConfig below since filterConfig folds these options in.
  const advertisementsScopedByAd = useMemo(
    () => (filters.adv_number
      ? advertisements.filter((a) => a.adv_number === filters.adv_number)
      : advertisements),
    [advertisements, filters.adv_number]
  );

  const cascadeAdvertisementOptions = useMemo(() => (
    advertisements
      .filter((a) => a.adv_number)
      .map((a) => ({ value: a.adv_number, label: formatAdvertisementLabel(a.adv_number) }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ), [advertisements]);

  const cascadeDepartmentOptions = useMemo(() => {
    const map = new Map();
    advertisementsScopedByAd.forEach((a) => {
      (a.job_details || []).forEach((jd) => {
        const key = getDeptKey(jd);
        if (key) map.set(key, getDeptLabel(jd));
      });
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [advertisementsScopedByAd]);

  const cascadePostOptions = useMemo(() => {
    const map = new Map();
    advertisementsScopedByAd.forEach((a) => {
      (a.job_details || []).forEach((jd) => {
        if (filters.department_hash_id && getDeptKey(jd) !== filters.department_hash_id) return;
        if (jd.hash_id && jd.designation) map.set(jd.hash_id, jd.designation);
      });
    });
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [advertisementsScopedByAd, filters.department_hash_id]);

  // Filter definitions built from real, complete lists (not just the current
  // page) so Exam Center / Advertisement No only ever offer values that
  // actually exist, and dropdown values are the raw ids the backend expects.
  // Single combined list — previously split across two separate filter bars
  // (base filters + the Advertisement -> Department -> Post cascade); merged
  // into one bar/one Search-Reset action, every original filter kept as-is.
  const filterConfig = useMemo(() => {
    const centerOptions = centers
      .filter((c) => c.id != null)
      .map((c) => ({ value: String(c.id), label: `${c.name}${c.city ? ` (${c.city})` : ''}` }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      // Advertisement -> Department -> Post cascade shown first/above the
      // rest of the filters — these three depend on each other (picking an
      // Advertisement narrows Department, picking a Department narrows Post).
      { name: 'section_cascade', label: 'Advertisement → Department → Post (dependent filters)', type: 'section' },
      { name: 'adv_number', label: 'Advertisement', type: 'select', options: cascadeAdvertisementOptions },
      { name: 'department_hash_id', label: 'Department', type: 'select', options: cascadeDepartmentOptions },
      { name: 'job_detail_hash_id', label: 'Post', type: 'select', options: cascadePostOptions },
      // Other Filters — one per remaining grid column (CNIC/Applicant Name/
      // Roll Number are covered together by the combined search box; the
      // Advertisement Job column is already covered by the cascade above).
      { name: 'section_independent', label: 'Other Filters', type: 'section' },
      { name: 'search', label: 'Search (Name / CNIC / Roll No)', type: 'text', placeholder: 'Search by name, CNIC, or Roll No' },
      { name: 'exam_center_id', label: 'Exam Center', type: 'select', options: centerOptions },
    ];
  }, [centers, cascadeAdvertisementOptions, cascadeDepartmentOptions, cascadePostOptions]);

  const hasActiveFilters = useMemo(() => Object.values(filters).some(Boolean), [filters]);

  // Changing a parent clears its dependent children so a stale, no-longer-valid
  // selection can't linger (e.g. picking a new Advertisement clears any
  // previously chosen Department/Post from the old one).
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      if (name === 'adv_number') return { ...prev, adv_number: value, department_hash_id: '', job_detail_hash_id: '' };
      if (name === 'department_hash_id') return { ...prev, department_hash_id: value, job_detail_hash_id: '' };
      return { ...prev, [name]: value };
    });
  };

  const handleClearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setDebouncedFilters(DEFAULT_FILTERS); // apply immediately, don't wait out the debounce
  };

  // The live `shortlisted` endpoint only accepts `advertisement_no` — it has
  // no department/post filter param. Department/Post are therefore applied
  // client-side by matching each row's `job_title` (its post/designation)
  // against the designation(s) that belong to the selected Department/Post
  // within the selected (or, if none, every) Advertisement.
  const activeDesignations = useMemo(() => {
    if (!debouncedFilters.job_detail_hash_id && !debouncedFilters.department_hash_id) return null;
    const scoped = debouncedFilters.adv_number
      ? advertisements.filter((a) => a.adv_number === debouncedFilters.adv_number)
      : advertisements;
    const set = new Set();
    scoped.forEach((a) => {
      (a.job_details || []).forEach((jd) => {
        if (!jd.designation) return;
        if (debouncedFilters.job_detail_hash_id) {
          if (jd.hash_id === debouncedFilters.job_detail_hash_id) set.add(jd.designation);
        } else if (getDeptKey(jd) === debouncedFilters.department_hash_id) {
          set.add(jd.designation);
        }
      });
    });
    return set;
  }, [advertisements, debouncedFilters]);

  // ── Data: search/filter/sort/paginate all happen server-side — this page
  // just requests the current page for the active filters and renders it. ──
  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      // Department/Post have no server-side filter param on this endpoint —
      // when either is active, pull a larger batch and narrow+paginate
      // client-side (below) instead of relying on server pagination.
      const needsClientNarrowing = activeDesignations !== null;

      const result = await RollNumberApi.getShortlisted({
        per_page:            needsClientNarrowing ? 2000 : paginationModel.pageSize,
        page:                needsClientNarrowing ? 1 : paginationModel.page + 1,
        search:              debouncedFilters.search,
        advertisement_no:    debouncedFilters.adv_number,
        exam_center_id:      debouncedFilters.exam_center_id,
        slip_status:         activeTab === 'published' ? 'published' : 'generated',
        has_roll_number:     1, // only candidates whose slip has been generated belong on this list
      });

      const payload = result?.data ?? {};
      const items   = Array.isArray(payload.data) ? payload.data : [];

      let mapped = items
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
            exam_type:             item.exam_type || null,
            // 'written' once a CCE Written Exam roll number slip has been
            // generated for this application (backend-derived — see
            // RollNumberController::index's applicationNumbersWithWrittenStage
            // check) — only ever set for the cce-exams flow.
            stage:                 item.stage || 'screening',
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

      if (needsClientNarrowing) {
        mapped = mapped.filter((row) => activeDesignations.has(row.job_title));
      }

      const pageRows = needsClientNarrowing
        ? mapped.slice(paginationModel.page * paginationModel.pageSize, (paginationModel.page + 1) * paginationModel.pageSize)
        : mapped;

      setAllRows(pageRows);
      setTotalCount(needsClientNarrowing ? mapped.length : (payload.total ?? mapped.length));
      // Stat cards are populated separately by fetchStats() below — the
      // backend's own `payload.stats` here is dataset-wide, not scoped to
      // whatever filters are active, so it's intentionally not used.
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
  }, [paginationModel, debouncedFilters, activeDesignations, activeTab]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // ── Stat cards, computed client-side and scoped to the current filters ──
  // The live backend's stat counts on this endpoint are dataset-wide (not
  // scoped to search/advertisement/exam-center filters) — fixing that
  // requires redeploying the live API, which isn't available right now — so
  // totals are computed here instead: pull every row matching the current
  // filters in one batch (both published AND unpublished together, so both
  // counts are available at once, independent of which tab is active) and
  // count client-side. Mirrors the per_page:5000 pattern the "...All"
  // bulk actions already use below.
  const fetchStats = useCallback(async () => {
    try {
      const result = await RollNumberApi.getShortlisted({
        per_page:            5000,
        page:                1,
        search:              debouncedFilters.search,
        advertisement_no:    debouncedFilters.adv_number,
        exam_center_id:      debouncedFilters.exam_center_id,
        has_roll_number:     1,
        // No slip_status — this needs published AND unpublished counts together.
      });
      const payload = result?.data ?? {};
      let items = Array.isArray(payload.data) ? payload.data : [];
      items = items.filter((item) => !!item.roll_number);
      if (activeDesignations !== null) {
        items = items.filter((item) => activeDesignations.has(item.job_title));
      }

      const publishedCount = items.filter((item) => !!item.published_at).length;
      const centerIds = new Set(items.filter((item) => item.exam_center_id != null).map((item) => item.exam_center_id));
      const cnics = new Set(items.filter((item) => item.candidate_cnic).map((item) => item.candidate_cnic));

      setStats({
        total:     items.length,
        unique:    cnics.size,
        generated: items.length - publishedCount,
        published: publishedCount,
        centers:   centerIds.size,
      });
    } catch {
      // silent — stat cards simply won't refresh for this filter combination
    }
  }, [debouncedFilters, activeDesignations]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
      await withRetry(() => RollNumberApi.deleteSlip(applicationNumber));
      toast.dismiss(tid);
      toast.success('Roll number slip deleted successfully');
      fetchApplications();
      fetchStats();
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
      const result = await withRetry(() => RollNumberApi.bulkDeleteSlips(rowsWithRoll.map(r => r.application_number)));
      toast.dismiss(tid);
      const count = result.data?.deleted ?? rowsWithRoll.length;
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} deleted successfully`);
      setSelectionModel([]);
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to delete slips');
    }
  };

  // Mirror of publishAllUnpublished/unpublishAllPublished — deletes every
  // slip on the ACTIVE TAB (unpublished or published) matching the current
  // filters, across ALL pages, instead of only whatever's checked/loaded.
  const deleteAllSlips = async () => {
    const tabLabel = activeTab === 'published' ? 'published' : 'unpublished';
    const findingTid = toast.loading(`Finding all ${tabLabel} slips…`);
    let rows;
    try {
      const result = await RollNumberApi.getShortlisted({
        per_page:            5000,
        page:                1,
        search:              debouncedFilters.search,
        advertisement_no:    debouncedFilters.adv_number,
        exam_center_id:      debouncedFilters.exam_center_id,
        slip_status:         activeTab === 'published' ? 'published' : 'generated',
        has_roll_number:     1,
      });
      const items = Array.isArray(result?.data?.data) ? result.data.data : [];
      rows = items.filter((item) => !!item.roll_number
        && (activeTab === 'published' ? !!item.published_at : !item.published_at));
      if (activeDesignations !== null) {
        rows = rows.filter((item) => activeDesignations.has(item.job_title));
      }
    } catch (err) {
      toast.dismiss(findingTid);
      toast.error(err?.message || `Failed to load ${tabLabel} slips`);
      return;
    }
    toast.dismiss(findingTid);

    if (rows.length === 0) {
      toast.error(`No ${tabLabel} slips found matching the current filters`);
      return;
    }

    const ok = await confirmDelete({
      title:      `Delete All ${activeTab === 'published' ? 'Published' : 'Unpublished'} Slips`,
      message:    `Remove roll numbers and exam center allocation for all ${rows.length} ${tabLabel} candidate${rows.length === 1 ? '' : 's'} matching the current filters — not just the ones selected?`,
      identifier: `${rows.length} slips`,
      warning:    'Those candidates will lose their roll numbers and allocations. You can regenerate new slips afterwards.',
    });
    if (!ok) return;

    const tid = toast.loading(`Deleting ${rows.length} slip${rows.length === 1 ? '' : 's'}…`);
    try {
      const result = await withRetry(() => RollNumberApi.bulkDeleteSlips(rows.map(r => r.application_number)));
      toast.dismiss(tid);
      const count = result.data?.deleted ?? rows.length;
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} deleted successfully`);
      setSelectionModel([]);
      fetchApplications();
      fetchStats();
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to delete slips');
    }
  };

  // ── Publish / Unpublish ─────────────────────────────────────────────────
  // Slips are grouped by advertisement (the publish/unpublish endpoint is
  // scoped per-advertisement) so a selection spanning multiple advertisements
  // still works in one action.
  //
  // Each advertisement is called ONE AT A TIME (not Promise.all) and with a
  // single automatic retry on failure. The live backend cascades a
  // publish/unpublish to sibling rows under OTHER advertisements (clubbed
  // posts), so firing every advertisement's request in parallel can
  // intermittently deadlock two of them against each other and return a
  // transient 500 — which used to abort the whole action even though most
  // advertisements had already committed. Retrying once covers the same
  // transient failure for a single advertisement (e.g. another admin acting
  // on it at the same moment).
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

    let count = 0;
    const failed = [];
    for (const adId of adIds) {
      let attempt = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        try {
          const r = await apiFn(adId, byAd[adId]);
          count += r.data?.published ?? r.data?.unpublished ?? 0;
          break;
        } catch (err) {
          if (attempt < 1) {
            attempt += 1;
            await new Promise((resolve) => setTimeout(resolve, 400));
            continue;
          }
          failed.push(adId);
          break;
        }
      }
    }
    return { count, failed };
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
      const { count, failed } = await runPublishAction(rows, 'publish');
      toast.dismiss(tid);
      setSelectionModel([]);
      fetchApplications();
      fetchStats();
      if (failed.length === 0) {
        toast.success(`${count} roll number slip${count === 1 ? '' : 's'} published successfully`);
      } else {
        toast.error(`${count} slip${count === 1 ? '' : 's'} published, but ${failed.length} advertisement${failed.length === 1 ? '' : 's'} failed — try again to retry ${failed.length === 1 ? 'it' : 'them'}.`);
      }
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
      const { count, failed } = await runPublishAction(rows, 'unpublish');
      toast.dismiss(tid);
      setSelectionModel([]);
      fetchApplications();
      fetchStats();
      if (failed.length === 0) {
        toast.success(`${count} roll number slip${count === 1 ? '' : 's'} unpublished successfully`);
      } else {
        toast.error(`${count} slip${count === 1 ? '' : 's'} unpublished, but ${failed.length} advertisement${failed.length === 1 ? '' : 's'} failed — try again to retry ${failed.length === 1 ? 'it' : 'them'}.`);
      }
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err?.message || 'Failed to unpublish slips');
    }
  };

  // "Select all" on the grid only ever selects the currently-loaded page —
  // the grid is server-paginated, so it has no way to know about rows on
  // other pages. This is a dedicated action that finds every unpublished
  // slip matching the current filters (across ALL pages) and publishes them,
  // instead of being limited to whatever page happens to be on screen.
  const publishAllUnpublished = async () => {
    const findingTid = toast.loading('Finding all unpublished slips…');
    let unpublished;
    try {
      const result = await RollNumberApi.getShortlisted({
        per_page:            5000,
        page:                1,
        search:              debouncedFilters.search,
        advertisement_no:    debouncedFilters.adv_number,
        exam_center_id:      debouncedFilters.exam_center_id,
        slip_status:         'generated',
        has_roll_number:     1,
      });
      const items = Array.isArray(result?.data?.data) ? result.data.data : [];
      unpublished = items.filter((item) => !item.published_at && item.roll_number && item.advertisement_hash_id);
      if (activeDesignations !== null) {
        unpublished = unpublished.filter((item) => activeDesignations.has(item.job_title));
      }
    } catch (err) {
      toast.dismiss(findingTid);
      toast.error(err?.message || 'Failed to load unpublished slips');
      return;
    }
    toast.dismiss(findingTid);

    if (unpublished.length === 0) {
      toast.error('No unpublished slips found matching the current filters');
      return;
    }

    const adIds = [...new Set(unpublished.map((item) => item.advertisement_hash_id))];

    const ok = await confirmDelete({
      title:       'Publish All Unpublished Slips',
      message:     `Publish roll number slips for all ${unpublished.length} unpublished candidate${unpublished.length === 1 ? '' : 's'} matching the current filters (across ${adIds.length} advertisement${adIds.length === 1 ? '' : 's'})? They will become visible to candidates immediately.`,
      identifier:  `${unpublished.length} slips`,
      warning:     'Candidates will be able to view and download these slips right away.',
      confirmLabel: 'Publish All',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;

    const tid = toast.loading(`Publishing ${unpublished.length} slip${unpublished.length === 1 ? '' : 's'}…`);
    // One advertisement at a time — not Promise.all. Firing every
    // advertisement's publish request in parallel let concurrent writes to
    // the same tables intermittently trip a transient 500 (DB lock
    // contention), which then aborted the whole batch even though most
    // advertisements had already committed successfully. Awaiting each call
    // lets its transaction fully commit before the next one starts, and a
    // failure on one advertisement no longer discards progress on the rest.
    let count = 0;
    const failed = [];
    for (const adId of adIds) {
      try {
        // No application_numbers passed — the backend publishes every
        // eligible unpublished slip for the advertisement in one go, so
        // this isn't limited by whatever page size the list above fetched.
        const r = await RollNumberApi.publishSlips(adId);
        count += r.data?.published ?? 0;
      } catch (err) {
        failed.push(adId);
      }
    }
    toast.dismiss(tid);
    setSelectionModel([]);
    fetchApplications();
    fetchStats();
    if (failed.length === 0) {
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} published successfully`);
    } else {
      toast.error(
        `${count} slip${count === 1 ? '' : 's'} published, but ${failed.length} advertisement${failed.length === 1 ? '' : 's'} failed — click Publish All again to retry ${failed.length === 1 ? 'it' : 'them'}.`
      );
    }
  };

  // Mirror of publishAllUnpublished, for the Published tab — unpublishes
  // every currently-published slip matching the current filters, across ALL
  // pages, instead of only whatever page the grid has loaded.
  const unpublishAllPublished = async () => {
    const findingTid = toast.loading('Finding all published slips…');
    let published;
    try {
      const result = await RollNumberApi.getShortlisted({
        per_page:            5000,
        page:                1,
        search:              debouncedFilters.search,
        advertisement_no:    debouncedFilters.adv_number,
        exam_center_id:      debouncedFilters.exam_center_id,
        slip_status:         'published',
        has_roll_number:     1,
      });
      const items = Array.isArray(result?.data?.data) ? result.data.data : [];
      published = items.filter((item) => !!item.published_at && item.roll_number && item.advertisement_hash_id);
      if (activeDesignations !== null) {
        published = published.filter((item) => activeDesignations.has(item.job_title));
      }
    } catch (err) {
      toast.dismiss(findingTid);
      toast.error(err?.message || 'Failed to load published slips');
      return;
    }
    toast.dismiss(findingTid);

    if (published.length === 0) {
      toast.error('No published slips found matching the current filters');
      return;
    }

    const adIds = [...new Set(published.map((item) => item.advertisement_hash_id))];

    const ok = await confirmDelete({
      title:       'Unpublish All Published Slips',
      message:     `Unpublish roll number slips for all ${published.length} published candidate${published.length === 1 ? '' : 's'} matching the current filters (across ${adIds.length} advertisement${adIds.length === 1 ? '' : 's'})? They will no longer be visible to candidates.`,
      identifier:  `${published.length} slips`,
      warning:     'Candidates will immediately lose access to view/download these slips.',
      confirmLabel: 'Unpublish All',
      confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!ok) return;

    const tid = toast.loading(`Unpublishing ${published.length} slip${published.length === 1 ? '' : 's'}…`);
    // One advertisement at a time — see publishAllUnpublished for why.
    let count = 0;
    const failed = [];
    for (const adId of adIds) {
      try {
        // No application_numbers passed — the backend unpublishes every
        // published slip for the advertisement in one go, so this isn't
        // limited by whatever page size the list above happened to fetch.
        const r = await RollNumberApi.unpublishSlips(adId);
        count += r.data?.unpublished ?? 0;
      } catch (err) {
        failed.push(adId);
      }
    }
    toast.dismiss(tid);
    setSelectionModel([]);
    fetchApplications();
    fetchStats();
    if (failed.length === 0) {
      toast.success(`${count} roll number slip${count === 1 ? '' : 's'} unpublished successfully`);
    } else {
      toast.error(
        `${count} slip${count === 1 ? '' : 's'} unpublished, but ${failed.length} advertisement${failed.length === 1 ? '' : 's'} failed — click Unpublish All again to retry ${failed.length === 1 ? 'it' : 'them'}.`
      );
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
      const { count, failed } = await runPublishAction([row], 'publish');
      toast.dismiss(tid);
      fetchApplications();
      fetchStats();
      if (failed.length === 0 && count > 0) {
        toast.success('Roll number slip published successfully');
      } else {
        toast.error('Failed to publish slip — please try again.');
      }
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
      const { count, failed } = await runPublishAction([row], 'unpublish');
      toast.dismiss(tid);
      fetchApplications();
      fetchStats();
      if (failed.length === 0 && count > 0) {
        toast.success('Roll number slip unpublished successfully');
      } else {
        toast.error('Failed to unpublish slip — please try again.');
      }
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
    { field: 'cnic',               headerName: 'CNIC',            minWidth: 150, flex: 0.9 },
    { field: 'applicant_name',     headerName: 'Applicant Name',  minWidth: 160, flex: 1.1 },
    {
      // Advertisement Number + Job Advertisement wrapped into one column,
      // stacked row-over-row, instead of two separate columns.
      field: 'advertisement_job',
      headerName: 'Advertisement Job',
      minWidth: 190,
      flex: 1.2,
      renderCell: (p) => (
        <div className="flex flex-col leading-tight py-1">
          <span className="text-sm font-medium text-slate-800">{p.row.advertisement_no || '—'}</span>
          <span className="text-xs text-slate-500">{p.row.job_title || '—'}</span>
        </div>
      ),
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
              <h1 className="text-2xl font-bold text-slate-900">
                {fixedTab === 'published' ? 'Published Roll Number Slips'
                  : fixedTab === 'unpublished' ? 'Unpublished Roll Number Slips'
                  : 'Roll Number Management'}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {fixedTab === 'published' ? 'Roll number slips already published and visible to candidates.'
                  : fixedTab === 'unpublished' ? 'Roll number slips generated but not yet published to candidates.'
                  : 'View and manage candidates with generated roll number slips.'}
              </p>
            </div>
          </div>
          {/* <Button variant="outline" size="md" onClick={fetchApplications} disabled={loading}
            className="h-10 w-10 min-w-[2.5rem] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            title="Refresh List" aria-label="Refresh List">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button> */}
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

        {/* FILTERS — single combined bar (base filters + the Advertisement ->
            Department -> Post cascade used to live in two separate cards) */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Roll Number Slips"
        />

        {/* ACTION BAR — always visible so "Publish/Unpublish Selected" (acts only
            on the checked rows) and "Publish/Unpublish ALL" (acts on every
            matching slip across every page) are never mistaken for each other. */}
        {canEdit && (
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
                    <Button onClick={bulkUnpublishSlips} variant="outline" size="sm"
                      className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                      disabled={selectedRows.filter(r => r.published_at).length === 0}>
                      <EyeOff size={14} /> Unpublish Selected ({selectedIds.length})
                    </Button>
                    {canDelete && (
                      <Button onClick={bulkDeleteSlips} variant="outline" size="sm"
                        className="flex items-center gap-2 border-red-300 text-red-700 hover:bg-red-50"
                        disabled={selectedRows.filter(r => r.roll_number).length === 0}>
                        <Trash2 size={14} /> Delete Roll No Slip ({selectedIds.length})
                      </Button>
                    )}
                    <Button onClick={bulkPublishSlips} variant="outline" size="sm"
                      className="flex items-center gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                      disabled={selectedRows.filter(r => r.roll_number && !r.published_at).length === 0}>
                      <Send size={14} /> Publish Selected ({selectedIds.length})
                    </Button>
                    <span className="mx-1 h-6 w-px bg-emerald-200" aria-hidden="true" />
                  </>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={deleteAllSlips}
                    disabled={(activeTab === 'published' ? stats.published : stats.generated) === 0}
                    title={`Deletes every ${activeTab === 'published' ? 'published' : 'unpublished'} slip across all pages, not just what's selected`}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-red-700 via-red-600 to-red-700 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-sm"
                  >
                    <Trash2 size={14} /> Delete All ({activeTab === 'published' ? stats.published : stats.generated})
                  </button>
                )}
                {activeTab === 'published' && (
                  <button
                    type="button"
                    onClick={unpublishAllPublished}
                    disabled={stats.published === 0}
                    title="Unpublishes every published slip across all pages, not just what's selected"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-amber-700 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-700 text-white shadow-md hover:shadow-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1.5 text-sm"
                  >
                    <EyeOff size={14} /> Unpublish All ({stats.published})
                  </button>
                )}
                {activeTab === 'unpublished' && (
                  <Button
                    onClick={publishAllUnpublished}
                    variant="primary"
                    size="sm"
                    disabled={stats.generated === 0}
                    className="gap-2"
                    title="Publishes every unpublished slip across all pages, not just what's selected"
                  >
                    <Send size={14} /> Publish All ({stats.generated})
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* GRID — Published / Unpublished are now separate pages (fixedTab set),
            so the in-page tab switcher only renders in the legacy combined mode
            (fixedTab unset), if this component is ever mounted without a fixed tab. */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {!fixedTab && (
          <div className="grid w-full grid-cols-2 overflow-hidden rounded-t-lg bg-white p-1">
            {TABS.map((t) => {
              const isActive = activeTab === t.id;
              const count = t.id === 'published' ? stats.published : stats.generated;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTabChange(t.id)}
                  className={`flex w-full items-center justify-center rounded-md px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white shadow-sm'
                      : 'bg-white text-emerald-900 hover:bg-emerald-50'
                  }`}
                >
                  {t.label}
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          )}

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
          onClick={() => {
            const row = selectedRow;
            handleMenuClose();
            if (!row) return;
            // A roll number can be shared by more than one of the
            // candidate's applications (e.g. multiple CCE posts) — pass
            // application_number too so the viewer loads THIS row's
            // application, not an arbitrary sibling that shares the roll number.
            const params = new URLSearchParams();
            if (row.application_number) params.set('application_number', row.application_number);
            // CCE Written Exam only: once a written roll number slip has been
            // generated (row.stage === 'written'), show that instead of the
            // screening slip. Every other exam type keeps showing the
            // screening slip it's always shown, since 'stage' only ever
            // flips to 'written' for the cce-exams flow.
            if (row.exam_type === 'cce-exams' && row.stage === 'written') params.set('stage', 'written');
            const query = params.toString() ? `?${params.toString()}` : '';
            navigate(`/dashboard/roll-numbers/slip/${encodeURIComponent(row.roll_number)}${query}`);
          }}
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
