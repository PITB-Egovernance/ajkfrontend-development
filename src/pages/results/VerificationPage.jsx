import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  UserMinus,
  RefreshCw,
} from 'lucide-react';
import ResultsApi from 'api/resultsApi';
import AdvertisementApi from 'api/advertisementApi';
import Button from 'components/ui/Button';
import { Card, CardContent } from 'components/ui/Card';
import { InlineLoader } from 'components/ui/Loader';
import SearchableSelect from 'components/ui/SearchableSelect';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import confirmDelete from 'components/ui/ConfirmDelete';
import { getJobRouteId } from 'utils/jobMapper';
import { fetchAndApplyClubbedGroups } from 'utils/resultsClubbing';

const FILTER_DEBOUNCE_MS = 400;

const DEFAULT_FILTERS = { search: '', status: 'all', adv_number: '' };

// A clubbed group can combine posts from more than one advertisement (see
// resultsClubbing.js) — its own `advertisements[0]` is only the anchor post's,
// so callers that need every advertisement actually present in a job entry
// (clubbed or not) should go through this instead of reading `advertisements`
// directly.
const getJobAdvNumbers = (job) => {
  if (job?.isClubbedGroup && job.clubbedAdvNumbers?.length) return job.clubbedAdvNumbers;
  const advNo = job?.advertisements?.[0]?.adv_number;
  return advNo ? [advNo] : [];
};

// Encodes "this clubbed group, narrowed to one member's advertisement" into a
// single dropdown option value (job route id + member adv number), since a
// clubbed group's several member posts need to be picked independently even
// though they all resolve to the one shared job id used for fetching.
const CLUB_MEMBER_SEP = '::adv::';

// Builds Job Post dropdown options for a list of jobs. A clubbed group is
// expanded into one row per member post (so they're picked separately, not
// hidden behind a single merged "X & Y" designation) plus one "All Combined"
// row for its shared/merged candidate view; a normal job gets a single row.
const buildJobOptions = (jobList) => jobList.flatMap((j, idx) => {
  const routeId = getJobRouteId(j) || (j.id ? j.id.toString() : '') || String(idx);
  if (j.isClubbedGroup && j.clubbedMembers?.length) {
    const memberOptions = j.clubbedMembers.map((m) => ({
      value: `${routeId}${CLUB_MEMBER_SEP}${m.adv_number || ''}`,
      label: `↳ ${m.designation} (Adv: ${m.adv_number || 'N/A'})`,
    }));
    return [
      { value: routeId, label: `${j.designation} — All Combined (Adv: ${j.clubbedAdvNumbers.join(', ')})` },
      ...memberOptions,
    ];
  }
  return [{ value: routeId, label: `${j.designation} (Adv: ${getJobAdvNumbers(j).join(', ') || 'N/A'})` }];
});

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Candidates' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'absent', label: 'Absent' },
  { value: 'pending', label: 'Pending / Unapproved' },
];

// House grid style — same header/row/checkbox/selection styling used across
// Roll Number Management, Post-Result Processing and every other DataGrid in
// the admin portal (gridSx convention).
const gridSx = {
  border: 'none',
  '& .MuiDataGrid-columnHeaders':    { backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' },
  '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
  '& .MuiDataGrid-cell':             { padding: '0 8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#334155' },
  '& .MuiDataGrid-row':              { minHeight: '64px !important', '&:hover': { backgroundColor: '#f8fafc' } },
  '& .MuiDataGrid-footerContainer':  { borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' },
  '& .MuiDataGrid-checkboxInput svg':             { color: '#064e3b' },
  '& .MuiDataGrid-checkboxInput.Mui-checked svg':  { color: '#064e3b' },
  '& .MuiCheckbox-root .MuiSvgIcon-root':          { color: '#064e3b' },
  '& .MuiCheckbox-root.Mui-checked .MuiSvgIcon-root': { color: '#064e3b' },
  '& .MuiDataGrid-row.Mui-selected':       { backgroundColor: '#ecfdf5' },
  '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: '#d1fae5' },
};

// House confirmation-prompt pattern — same toast used for Roll Number Slip
// publish/unpublish (components/ui/ConfirmDelete.jsx), reused here for
// Approve / Mark Absent so every bulk action across the app asks the same way.
const confirmApprove = (count) => confirmDelete({
  title: 'Approve Results',
  message: `Approve the results of ${count} selected candidate${count === 1 ? '' : 's'}?`,
  warning: 'Approved results move into Post-Result Processing (Passed Candidates).',
  confirmLabel: 'Approve',
  confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
});

const confirmMarkAbsent = (count) => confirmDelete({
  title: 'Mark Candidates Absent',
  message: `Mark ${count} selected candidate${count === 1 ? '' : 's'} as ABSENT?`,
  warning: 'This overrides their exam status to Absent and clears all entered marks. This cannot be easily undone.',
  confirmLabel: 'Mark Absent',
  confirmColor: 'bg-amber-600 hover:bg-amber-700',
});

// Reject needs a mandatory reason, so it gets its own toast prompt with a
// textarea — same visual language as confirmDelete, following the
// mandatory-reason pattern already used for emergency result withdrawal.
const confirmRejectWithReason = (count) =>
  new Promise((resolve) => {
    let reasonText = '';
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[340px] p-1 text-left">
        <div>
          <p className="font-semibold text-gray-800">Reject Results</p>
          <p className="text-sm text-gray-600 mt-1">
            Reject the results of {count} selected candidate{count === 1 ? '' : 's'}?
          </p>
          <p className="text-xs text-rose-600 mt-1">A reason is required and will be logged in the audit trail.</p>
        </div>
        <textarea
          rows={3}
          placeholder="e.g. Mismatched roll number details or incomplete answer script..."
          onChange={(e) => { reasonText = e.target.value; }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => { toast.dismiss(t.id); resolve(null); }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const trimmed = reasonText.trim();
              if (!trimmed) { toast.error('Rejection reason is mandatory.', { id: 'reject-validation' }); return; }
              toast.dismiss(t.id); resolve(trimmed);
            }}
            className="px-4 py-2 text-sm font-medium text-white rounded-md transition-colors bg-rose-600 hover:bg-rose-700"
          >
            Confirm Rejection
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  });

const VerificationPage = () => {
  const { jobId: urlJobId } = useParams();
  const navigate = useNavigate();

  // Jobs
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(urlJobId || '');
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Candidates
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, has_more: false, next_cursor: null });
  const [cursor, setCursor] = useState(null);

  // Filters (debounced, same pattern as Roll Number Management)
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters]);

  // Advertisement options + Job Post options driven straight off `filters`
  // (not debounced — these narrow local dropdown lists, not an API call, so
  // there's no reason to make the pickers feel laggy).
  const advertisementOptions = useMemo(() => {
    const seen = new Map();
    jobs.forEach((j) => {
      getJobAdvNumbers(j).forEach((advNo) => {
        if (!seen.has(advNo)) seen.set(advNo, `${advNo}`);
      });
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [jobs]);

  const jobsForSelectedAdv = useMemo(
    () => (filters.adv_number ? jobs.filter((j) => getJobAdvNumbers(j).includes(filters.adv_number)) : []),
    [jobs, filters.adv_number]
  );

  const jobPostOptions = useMemo(() => {
    const scoped = filters.adv_number ? jobsForSelectedAdv : jobs;
    const options = buildJobOptions(scoped);
    // Combined view across every post under the selected Advertisement — lets
    // the admin approve/reject candidates advertisement-wide instead of
    // picking through one job post at a time.
    if (filters.adv_number && scoped.length > 1) {
      options.unshift({ value: '', label: `All Job Posts — Adv ${filters.adv_number} (Combined)` });
    }
    return options;
  }, [jobs, jobsForSelectedAdv, filters.adv_number]);

  // Whether we're showing the combined, advertisement-wide candidate list
  // rather than a single job post's candidates.
  const isCombinedView = Boolean(filters.adv_number) && !selectedJobId;

  // The Job Post dropdowns need to display a clubbed group's member row (not
  // just the group itself) once the admin has narrowed to one of its
  // advertisements — selectedJobId alone can't carry that, so re-derive the
  // exact option value here for display purposes only.
  const selectedJobOptionValue = useMemo(() => {
    if (!selectedJobId) return '';
    if (selectedJob?.isClubbedGroup && filters.adv_number && selectedJob.clubbedAdvNumbers?.includes(filters.adv_number)) {
      return `${selectedJobId}${CLUB_MEMBER_SEP}${filters.adv_number}`;
    }
    return selectedJobId;
  }, [selectedJobId, selectedJob, filters.adv_number]);

  // Combined filter config for the single filters card: Search + Exam Status
  // + Advertisement. Job Post is rendered separately via `extraFilters` since
  // picking one drives navigation/selectedJobId, not just a filter value.
  const filterConfig = useMemo(() => [
    { name: 'search', label: 'Search', type: 'text', placeholder: 'Roll number or candidate name' },
    { name: 'status', label: 'Exam Status', type: 'select', options: STATUS_OPTIONS },
    { name: 'adv_number', label: 'Advertisement', type: 'select', options: advertisementOptions },
  ], [advertisementOptions]);

  // Keep the Advertisement filter in sync with whichever job is actually
  // selected (e.g. on first load via the URL's :jobId), without fighting the
  // user's own Advertisement pick — only auto-syncs when it doesn't match.
  // Clubbed groups are skipped: they can have several valid advertisements,
  // and handleJobChange/handleFilterChange already manage adv_number for
  // them explicitly (picking a member vs. "All Combined").
  useEffect(() => {
    if (selectedJob?.isClubbedGroup) return;
    const advNo = selectedJob?.advertisements?.[0]?.adv_number;
    if (advNo && advNo !== filters.adv_number) {
      setFilters((prev) => ({ ...prev, adv_number: advNo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJob]);

  // Selection
  const [selectedApps, setSelectedApps] = useState([]);
  const [processingAction, setProcessingAction] = useState(false);

  // Clubbed-group Approve gate: a clubbed group only makes sense to approve
  // as a whole, so at least one candidate from EVERY member post must be in
  // the current selection first — never just some of them. Candidate rows
  // don't carry a job post id (see CandidateListService::transformResults),
  // so each member post is matched by its own designation, which is unique
  // within the group (members are joined with " & " to build the group's
  // merged designation).
  const missingClubbedMembers = useMemo(() => {
    if (!selectedJob?.isClubbedGroup || !selectedJob.clubbedMembers?.length) return [];
    const selectedSet = new Set(selectedApps);
    const coveredDesignations = new Set(
      candidates.filter((c) => selectedSet.has(c.app_id)).map((c) => c.job_designation)
    );
    return selectedJob.clubbedMembers.filter((m) => {
      if (coveredDesignations.has(m.designation)) return false;
      // A member post that has already had every one of its own candidates
      // resolved (Approved/Rejected) has nothing left to select — don't keep
      // demanding representation from it forever on later cleanup batches
      // that only touch the OTHER posts' remaining stragglers.
      const hasUnresolvedCandidate = candidates.some(
        (c) => c.job_designation === m.designation && !['Approved', 'Rejected'].includes(c.marks_status)
      );
      return hasUnresolvedCandidate;
    });
  }, [selectedJob, selectedApps, candidates]);

  const isClubbedApproveBlocked = Boolean(selectedJob?.isClubbedGroup) && missingClubbedMembers.length > 0;

  // Fetch active jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setJobsLoading(true);
        const adsRes = await AdvertisementApi.getAll(1, { per_page: 100, results_only: true });
        let advertisements = [];
        if (adsRes && adsRes.data) {
          if (Array.isArray(adsRes.data.data)) advertisements = adsRes.data.data;
          else if (Array.isArray(adsRes.data)) advertisements = adsRes.data;
        }

        const fetchedJobs = advertisements.flatMap((adv) =>
          (adv.job_details || adv.jobDetails || []).map((job) => ({ ...job, advertisements: [adv] }))
        );

        let groupedJobs;
        try {
          groupedJobs = await fetchAndApplyClubbedGroups(ResultsApi, fetchedJobs);
        } catch {
          groupedJobs = fetchedJobs;
        }
        setJobs(groupedJobs);

        if (groupedJobs.length > 0) {
          let matched = null;
          if (urlJobId) {
            matched = groupedJobs.find(
              (j) => (j.isClubbedGroup && j.clubbedJobIds.includes(urlJobId)) || getJobRouteId(j) === urlJobId
            );
          }

          if (matched) {
            setSelectedJob(matched);
            setSelectedJobId(getJobRouteId(matched) || '');
          } else {
            // No specific job requested via the URL — default to the
            // Advertisement filter already having a value selected, with
            // every candidate under it shown (combined view), rather than
            // landing on one arbitrary job post.
            const firstAdvJob = groupedJobs.find((j) => getJobAdvNumbers(j).length > 0);
            const defaultAdv = firstAdvJob ? getJobAdvNumbers(firstAdvJob)[0] : '';
            if (defaultAdv) {
              setFilters((prev) => ({ ...prev, adv_number: defaultAdv }));
              setSelectedJobId('');
              setSelectedJob(null);
            } else {
              // No advertisement info at all — fall back to the old default.
              setSelectedJob(groupedJobs[0]);
              setSelectedJobId(getJobRouteId(groupedJobs[0]) || '');
            }
          }
        }
      } catch (err) {
        toast.error('Failed to load active jobs: ' + err.message);
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, [urlJobId]);

  // Combined view: no single job post backs this, so fetch every post under
  // the selected Advertisement in parallel and merge — there's no backend
  // endpoint for "all candidates under an advertisement" today, but each
  // application belongs to exactly one job post, so a client-side merge is
  // safe and keyset pagination isn't needed at advertisement scale.
  const fetchCombinedCandidates = async () => {
    if (jobsForSelectedAdv.length === 0) return;
    try {
      setLoading(true);
      const params = {
        limit: 200,
        search: debouncedFilters.search || undefined,
        status_filter: debouncedFilters.status !== 'all' ? debouncedFilters.status : undefined,
      };
      const results = await Promise.all(
        jobsForSelectedAdv.map((j) => {
          const routeId = getJobRouteId(j);
          return routeId ? ResultsApi.getCandidates(routeId, params).catch(() => null) : null;
        })
      );
      // A job entry in jobsForSelectedAdv can itself be a clubbed group with
      // OTHER member advertisements — re-filter by each candidate's own
      // adv_number so those unrelated members don't leak into this view.
      const merged = results.filter(Boolean).flatMap((res) => res.data || [])
        .filter((c) => c.adv_number === filters.adv_number);
      setCandidates(merged);
      setPagination({ total: merged.length, has_more: false, next_cursor: null });
      setSelectedApps([]);
    } catch (err) {
      toast.error('Failed to load candidates for verification');
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async (reset = false) => {
    if (isCombinedView) return fetchCombinedCandidates();
    if (!selectedJobId) return;
    try {
      setLoading(true);
      const params = {
        limit: 50,
        search: debouncedFilters.search || undefined,
        status_filter: debouncedFilters.status !== 'all' ? debouncedFilters.status : undefined,
        cursor: reset ? undefined : cursor || undefined,
      };
      const res = await ResultsApi.getCandidates(selectedJobId, params);
      if (res.data) {
        setCandidates(res.data);
        setPagination({
          total: res.pagination?.total || 0,
          has_more: res.pagination?.has_more || false,
          next_cursor: res.pagination?.next_cursor || null,
        });
        if (reset) setSelectedApps([]);
      }
    } catch (err) {
      toast.error('Failed to load candidates for verification');
    } finally {
      setLoading(false);
    }
  };

  // Deliberately keyed on debouncedFilters.search/.status rather than the
  // whole debouncedFilters object — adv_number narrowing within an already-
  // selected clubbed group is handled client-side (see displayedCandidates)
  // and must NOT refetch (which would also wipe the in-progress selection,
  // see handleJobChange/handleFilterChange). A genuine advertisement/job
  // switch still refetches via the selectedJobId/isCombinedView/
  // jobsForSelectedAdv deps below.
  useEffect(() => {
    if (selectedJobId || isCombinedView) fetchCandidates(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedJobId, isCombinedView, jobsForSelectedAdv, debouncedFilters.search, debouncedFilters.status]);

  useEffect(() => {
    if (cursor) fetchCandidates(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const handleJobChange = (e) => {
    const raw = e.target.value;
    setCursor(null);

    if (!raw) {
      // "All Job Posts" combined view — a genuinely different candidate set
      // (across separate job posts), so the previous selection is stale.
      setSelectedApps([]);
      setSelectedJobId('');
      setSelectedJob(null);
      return;
    }

    // A clubbed member row encodes its own advertisement into the option
    // value (`jobId::adv::advNumber`) — split it back apart so the actual
    // fetch still targets the shared clubbed job id, while the Advertisement
    // filter narrows the table to just that member's candidates.
    const [jobId, memberAdv] = raw.split(CLUB_MEMBER_SEP);
    // Switching between a clubbed group's own member rows (or "All Combined")
    // keeps the same underlying job id and the same already-loaded candidate
    // data — only the display narrowing changes — so keep the selection the
    // admin has already built up instead of wiping it. Only a genuine switch
    // to a different job/clubbed group clears it.
    if (jobId !== selectedJobId) setSelectedApps([]);
    setSelectedJobId(jobId);
    const matched = jobs.find((j) => getJobRouteId(j) === jobId);
    setSelectedJob(matched || null);

    if (memberAdv) {
      setFilters((prev) => ({ ...prev, adv_number: memberAdv }));
    } else if (matched?.isClubbedGroup) {
      // "All Combined" row — show every member's candidates, unfiltered.
      setFilters((prev) => ({ ...prev, adv_number: '' }));
    } else if (matched) {
      setFilters((prev) => ({ ...prev, adv_number: getJobAdvNumbers(matched)[0] || prev.adv_number }));
    }

    if (matched) {
      navigate(`/dashboard/results/verification/${getJobRouteId(matched)}`, { replace: true });
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCursor(null);

    // Picking an Advertisement: land on the combined "All Job Posts" view for
    // it (every candidate under that advertisement, ready to approve/reject
    // together) unless the currently selected post already belongs to it —
    // which, for a clubbed group spanning multiple advertisements, also
    // covers picking one of its *other* member advertisements: stay put and
    // let the candidate table narrow itself down (see displayedCandidates)
    // instead of jumping away to a different job post.
    if (name === 'adv_number' && value) {
      const stillValid = selectedJobId && jobs.some(
        (j) => getJobRouteId(j) === selectedJobId && getJobAdvNumbers(j).includes(value)
      );
      if (!stillValid) {
        setSelectedJobId('');
        setSelectedJob(null);
      }
    }
  };

  const handleClearFilters = () => {
    setCursor(null);
    setSelectedJobId('');
    setSelectedJob(null);

    // Same default as initial load: land back on the first advertisement's
    // combined view (every candidate under it) rather than an arbitrary
    // single job post.
    const firstAdvJob = jobs.find((j) => getJobAdvNumbers(j).length > 0);
    const defaultAdv = firstAdvJob ? getJobAdvNumbers(firstAdvJob)[0] : '';
    setFilters({ ...DEFAULT_FILTERS, adv_number: defaultAdv });
    setDebouncedFilters({ ...DEFAULT_FILTERS, adv_number: defaultAdv });
  };

  // ── Bulk execution ──
  const executeBulkAction = async (action, reasonStr = '') => {
    if (selectedApps.length === 0) return;

    setProcessingAction(true);
    const tid = toast.loading('Processing action...');
    try {
      await ResultsApi.bulkAction({
        // Combined view spans multiple job posts, so there's no single job
        // post id to report — the Advertisement number stands in for it
        // (each application still resolves to its own job post server-side).
        job_post_id: selectedJobId || `adv-${filters.adv_number}`,
        action,
        application_ids: selectedApps,
        reason: reasonStr,
      });

      setSelectedApps([]);
      toast.dismiss(tid);

      if (action === 'approve') {
        toast.success('Results approved — opening Post-Result Processing...');
        navigate(`/dashboard/results/post-result`);
        return;
      }

      toast.success('Bulk action completed successfully!');
      fetchCandidates(true);
    } catch (err) {
      toast.dismiss(tid);
      toast.error(err.message || 'Bulk action failed');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleBulkApprove = async () => {
    if (isClubbedApproveBlocked) {
      toast.error(
        `Select at least one candidate for every clubbed post before approving — still missing: ${missingClubbedMembers.map((m) => m.designation).join(', ')}.`
      );
      return;
    }
    const ok = await confirmApprove(selectedApps.length);
    if (ok) executeBulkAction('approve');
  };

  const handleBulkReject = async () => {
    const reason = await confirmRejectWithReason(selectedApps.length);
    if (reason) executeBulkAction('reject', reason);
  };

  const handleBulkMarkAbsent = async () => {
    const ok = await confirmMarkAbsent(selectedApps.length);
    if (ok) executeBulkAction('mark_absent');
  };

  const columns = useMemo(() => [
    {
      field: 'full_name',
      headerName: 'Candidate & Roll No',
      flex: 2,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => {
        const cand = params.row;
        return (
          <div className="py-2 text-left w-full">
            <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-semibold font-mono">
              Roll No: {cand.roll_no || 'Pending'}
            </span>
            <h5 className="font-semibold text-slate-800 text-sm mt-1 truncate" title={cand.full_name}>{cand.full_name}</h5>
            <p className="text-xs text-slate-400 font-mono">{cand.cnic}</p>
          </div>
        );
      },
    },
    {
      field: 'job_designation',
      headerName: 'Post & Advertisement',
      flex: 2,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => {
        const cand = params.row;
        return (
          <div className="py-2 text-left w-full">
            <p className="font-semibold text-slate-800 text-sm truncate" title={cand.job_designation}>
              {cand.job_designation || 'N/A'}
            </p>
            <p className="text-xs text-slate-400">Adv: {cand.adv_number || 'N/A'}</p>
          </div>
        );
      },
    },
    {
      field: 'marks_summary',
      headerName: 'Subject Breakdown',
      flex: 3,
      minWidth: 300,
      sortable: false,
      renderCell: (params) => {
        const cand = params.row;
        const subjects = cand.marks_summary ? Object.entries(cand.marks_summary) : [];
        return (
          <div className="py-2 text-left w-full">
            {cand.status === 'absent' ? (
              <span className="text-xs text-slate-400 italic">Candidate Absent</span>
            ) : subjects.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-[56px] overflow-y-auto pr-1">
                {subjects.map(([name, scoreInfo]) => (
                  <span key={name} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-medium text-xs text-slate-600">
                    {name}: <strong className="text-slate-800">{scoreInfo.obtained} / {scoreInfo.total}</strong>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                Marks Pending Ingestion
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'percentage',
      headerName: 'Percentage',
      flex: 1,
      minWidth: 110,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const cand = params.row;
        return (
          <span className="font-bold text-slate-800 text-sm tabular-nums">
            {['absent', 'rl', 'ufm'].includes(cand.status) ? '—' : cand.percentage !== null ? `${Number(cand.percentage).toFixed(2)}%` : '—'}
          </span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Exam Status',
      flex: 1,
      minWidth: 120,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const status = params.value;
        const map = {
          pass:   { label: 'Passed',  cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          fail:   { label: 'Failed',  cls: 'bg-rose-50 border-rose-200 text-rose-700' },
          absent: { label: 'Absent',  cls: 'bg-slate-100 border-slate-300 text-slate-600' },
          rl:     { label: 'RL',      cls: 'bg-amber-50 border-amber-200 text-amber-700' },
          ufm:    { label: 'UFM',     cls: 'bg-red-50 border-red-300 text-red-700' },
        };
        const conf = map[status];
        if (!conf) return null;
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${conf.cls}`}>
            {conf.label}
          </span>
        );
      },
    },
    {
      field: 'marks_status',
      headerName: 'Verification Status',
      flex: 1.5,
      minWidth: 160,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const status = params.value;
        const map = {
          'Approved':            { label: 'Approved',            cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', Icon: CheckCircle2 },
          'Rejected':            { label: 'Rejected',            cls: 'bg-rose-50 border-rose-200 text-rose-700', Icon: XCircle },
          'Under Verification':  { label: 'Under Verification',  cls: 'bg-amber-50 border-amber-200 text-amber-700', Icon: AlertCircle },
          'Uploaded':            { label: 'Uploaded',            cls: 'bg-slate-100 border-slate-200 text-slate-600', Icon: null },
        };
        const conf = map[status];
        if (!conf) return null;
        const { Icon } = conf;
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${conf.cls}`}>
            {Icon && <Icon size={11} />} {conf.label}
          </span>
        );
      },
    },
  ], []);

  // A clubbed group's fetch already returns every member post's candidates
  // merged together (tagged per-row with their own adv_number) — so once
  // the admin picks one of that group's several advertisements, narrow the
  // table down client-side rather than refetching.
  const displayedCandidates = useMemo(() => {
    if (selectedJob?.isClubbedGroup && filters.adv_number && selectedJob.clubbedAdvNumbers?.includes(filters.adv_number)) {
      return candidates.filter((c) => c.adv_number === filters.adv_number);
    }
    return candidates;
  }, [candidates, selectedJob, filters.adv_number]);

  if (jobsLoading) {
    return (
      <div className="p-6 bg-slate-50 min-h-screen flex items-center justify-center">
        <InlineLoader text="Loading jobs..." />
      </div>
    );
  }

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/results')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500 hover:text-slate-900 border border-slate-200 bg-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="p-2 bg-emerald-50 rounded-lg"><ShieldCheck size={22} className="text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Results Verification Queue</h1>
              <p className="text-sm text-slate-500 mt-1">Bulk verification and ingestion audit.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-[280px]">
              <SearchableSelect
                value={selectedJobOptionValue}
                onChange={handleJobChange}
                options={buildJobOptions(jobs)}
              />
            </div>
            {/*<Button variant="outline" size="md" onClick={() => fetchCandidates(true)} disabled={loading}
              className="h-10 w-10 min-w-[2.5rem] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Refresh" aria-label="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>*/}
          </div>
        </div>

        {/* INFO STRIP */}
        {isCombinedView ? (
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Advertisement (Combined View)</span>
                <h3 className="text-base font-bold text-emerald-900">Adv: {filters.adv_number}</h3>
                <p className="text-xs text-emerald-700/80">
                  Showing candidates across all {jobsForSelectedAdv.length} job post{jobsForSelectedAdv.length === 1 ? '' : 's'} under this advertisement.
                </p>
              </div>
              <div className="px-4 py-2 bg-white rounded-lg text-center border border-emerald-200">
                <span className="block text-xs font-medium text-slate-500">Candidates Loaded</span>
                <span className="text-sm font-bold text-emerald-700">{pagination.total}</span>
              </div>
            </CardContent>
          </Card>
        ) : selectedJob && (
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  {selectedJob.isClubbedGroup ? 'Active Post (Clubbed Group)' : 'Active Post'}
                </span>
                <h3 className="text-base font-bold text-emerald-900">{selectedJob.designation}</h3>
                {selectedJob.isClubbedGroup && selectedJob.clubbedAdvNumbers?.length > 0 ? (
                  <p className="text-xs text-emerald-700/80">
                    Advertisements: {selectedJob.clubbedAdvNumbers.join(', ')} — use the Advertisement filter above to narrow the table to one of them.
                  </p>
                ) : (
                  <p className="text-xs text-emerald-700/80">Department: {selectedJob.department?.name || 'AJK PSC'}</p>
                )}
              </div>
              <div className="px-4 py-2 bg-white rounded-lg text-center border border-emerald-200">
                <span className="block text-xs font-medium text-slate-500">Passing Criteria</span>
                <span className="text-sm font-bold text-emerald-700">{selectedJob.passing_percentage || 50.0}% Score</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FILTERS — Search, Exam Status, Advertisement & Job Post all in one card */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Candidates"
          extraFilters={
            <SearchableSelect
              label="Job Post"
              value={selectedJobOptionValue}
              onChange={handleJobChange}
              options={jobPostOptions}
              placeholder="All Job Posts"
            />
          }
        />

        {/* BULK BAR */}
        {selectedApps.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <span className="text-emerald-800 font-medium text-sm">
                {selectedApps.length} candidate{selectedApps.length === 1 ? '' : 's'} selected
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkApprove}
                  disabled={processingAction || isClubbedApproveBlocked}
                  size="sm"
                  className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
                  title={isClubbedApproveBlocked
                    ? `Select at least one candidate for every clubbed post first — still missing: ${missingClubbedMembers.map((m) => m.designation).join(', ')}.`
                    : undefined}
                >
                  <UserCheck size={14} /> Approve
                </Button>
                <Button onClick={handleBulkReject} disabled={processingAction} variant="outline" size="sm"
                  className="flex items-center gap-2 border-rose-300 text-rose-700 hover:bg-rose-50">
                  <UserMinus size={14} /> Reject
                </Button>
                <Button onClick={handleBulkMarkAbsent} disabled={processingAction} variant="outline" size="sm"
                  className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50">
                  <XCircle size={14} /> Mark Absent
                </Button>
              </div>
            </div>
            {isClubbedApproveBlocked && (
              <p className="text-xs text-amber-700 mt-2">
                This is a clubbed group of {selectedJob.clubbedMembers.length} posts — select at least one candidate for each before Approve is enabled.
                Still missing: {missingClubbedMembers.map((m) => m.designation).join(', ')}.
              </p>
            )}
          </div>
        )}

        {/* GRID */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && candidates.length === 0 ? (
            <div className="p-10 flex justify-center">
              <InlineLoader text="Fetching candidate records..." variant="ring" size="lg" />
            </div>
          ) : displayedCandidates.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">No Candidate Records</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">No candidate results matched your active filters or search criteria.</p>
              </div>
            </div>
          ) : (
            <TooltipDataGrid
              sx={gridSx}
              rows={displayedCandidates.map((cand) => ({ ...cand, id: cand.app_id }))}
              columns={columns}
              checkboxSelection
              rowSelectionModel={selectedApps}
              onRowSelectionModelChange={(newSelection) => setSelectedApps(newSelection)}
              // autoHeight
              disableRowSelectionOnClick
              hideFooter
            />
          )}
        </div>

        {/* KEYSET PAGINATION */}
        {pagination.has_more && (
          <div className="flex justify-center pt-2">
            <Button
              onClick={() => setCursor(pagination.next_cursor)}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              {loading ? 'Loading...' : 'Load More Candidates'}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
};

export default VerificationPage;
