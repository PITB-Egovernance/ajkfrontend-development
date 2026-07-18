import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, Download, FileSpreadsheet, RefreshCw, Plus, EyeOff, Eye, ShieldCheck, MapPin, Calendar, Users, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import TooltipDataGrid from 'components/ui/TooltipDataGrid';
import { Card, CardContent } from 'components/ui/Card';
import Button from 'components/ui/Button';
import { InlineLoader } from 'components/ui/Loader';
import confirmDelete from 'components/ui/ConfirmDelete';
import AdvancedFilter from 'components/tables/AdvancedFilter';
import SearchableSelect from 'components/ui/SearchableSelect';
import PostResultApi from 'api/postResultApi';
import AdvertisementApi from 'api/advertisementApi';
import { getJobRouteId } from 'utils/jobMapper';

const FILTER_DEBOUNCE_MS = 400;
const DEFAULT_FILTERS = { search: '', adv_number: '' };

// Unlike Roll Number generation (many exam centers to choose from), interview
// phases are always held at a single fixed venue — no center-selection step
// is needed, just the venue shown as a fixed notice.
const INTERVIEW_VENUE = 'AJK Public Service Commission Main Office';
const EMPTY_NEW_PHASE = { phase_name: '', interview_date: '', reporting_time: '', interview_time: '', capacity: '', venue: INTERVIEW_VENUE };

// Same "results verified/approved onward" gate used by the Post-Result
// landing page and the per-job Actions menu (isShortlistable).
const ELIGIBLE_STATUSES = [
  'Approved', 'APPROVED', 'WITHDRAWN',
  'Published', 'PROVISIONAL PUBLISHED', 'FINAL PUBLISHED', 'GAZETTE PUBLISHED',
];

// House grid style — same header/row/checkbox/selection styling used across
// Roll Number Management, Verification Queue and every other DataGrid in the
// admin portal (gridSx convention).
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

const TABS = [
  { id: 'passed', label: 'Passed Candidates' },
  { id: 'shortlisted', label: 'Shortlisted for Documents' },
  { id: 'initial-rejection', label: 'Initial Rejection' },
  { id: 'final-rejection', label: 'Final Rejection' },
  { id: 'interview', label: 'Interview Candidates' },
  { id: 'award-list', label: 'Award List' },
  { id: 'onboarding', label: 'Onboarding' },
];

// Mandatory-reason confirmation toast — mirrors the pattern already used for
// emergency result withdrawal (ResultsExamFlow.jsx / ResultsDashboard.jsx).
const confirmWithReason = ({ title, label = 'Provide a reason:', confirmLabel = 'Confirm', confirmColor = 'bg-rose-600 hover:bg-rose-700' }) =>
  new Promise((resolve) => {
    let reasonText = '';
    toast((t) => (
      <div className="flex flex-col gap-3 min-w-[340px] p-1 text-left">
        <div>
          <p className="font-bold text-slate-800 text-sm">{title}</p>
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
        <textarea rows={3} placeholder="Enter reason..."
          onChange={(e) => { reasonText = e.target.value; }}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 bg-white" />
        <div className="flex gap-2 justify-end">
          <button onClick={() => { toast.dismiss(t.id); resolve(null); }}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={() => {
            const trimmed = reasonText.trim();
            if (!trimmed) { toast.error('A reason is required.', { id: 'reason-validation' }); return; }
            toast.dismiss(t.id); resolve(trimmed);
          }} className={`px-3 py-1.5 text-xs font-semibold text-white rounded-md transition-colors ${confirmColor}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    ), { duration: Infinity, position: 'top-center' });
  });

const numberCol = (field, headerName, width = 110) => ({ field, headerName, width, sortable: false });
const textCol = (field, headerName, flex = 1) => ({ field, headerName, flex, minWidth: 140, sortable: false });

// Same colored-pill convention used for Exam Status / Verification Status on
// the Verification Queue page (emerald = positive/final, blue = in progress,
// amber = pending action, rose/red = rejected, slate = neutral/none).
const STATUS_BADGES = {
  passed:                    { label: 'Passed',                     cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  shortlisted_for_documents: { label: 'Shortlisted for Documents',  cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  selected_for_interview:    { label: 'Selected for Interview',     cls: 'bg-blue-50 border-blue-200 text-blue-700' },
  interview_completed:       { label: 'Interview Completed',        cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  selected_after_interview:  { label: 'Selected (Successful)',      cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  reselected:                { label: 'Reselected',                 cls: 'bg-teal-50 border-teal-200 text-teal-700' },
  initially_rejected:        { label: 'Initially Rejected',         cls: 'bg-rose-50 border-rose-200 text-rose-700' },
  finally_rejected:          { label: 'Finally Rejected',           cls: 'bg-red-50 border-red-300 text-red-700' },
  draft:                     { label: 'Draft',                      cls: 'bg-slate-100 border-slate-300 text-slate-600' },
  published:                 { label: 'Published',                  cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  not_generated:             { label: 'Not Generated',              cls: 'bg-slate-100 border-slate-200 text-slate-500' },
  onboarding_started:        { label: 'Onboarding Started',         cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  onboarded:                 { label: 'Onboarded',                  cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
};

const StatusPill = ({ value }) => {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  const conf = STATUS_BADGES[value] || { label: value.replace(/_/g, ' '), cls: 'bg-slate-100 border-slate-200 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${conf.cls}`}>
      {conf.label}
    </span>
  );
};

const statusCol = (field, headerName, flex = 1) => ({
  field, headerName, flex, minWidth: 160, sortable: false,
  align: 'center', headerAlign: 'center',
  renderCell: (params) => <StatusPill value={params.value} />,
});

// Same step-header + stat-card convention used by the Roll Number Center
// Allocation wizard (RollNumberExamFlow.jsx), reused here for Interview
// Phase Allocation.
const StepHeader = ({ title, subtitle }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-900 text-sm font-bold text-white">
      <Calendar size={16} />
    </div>
    <div>
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const PostResultWorkflow = () => {
  const navigate = useNavigate();
  const { jobId } = useParams();

  const [activeTab, setActiveTab] = useState('passed');
  const [jobInfo, setJobInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [selectionModel, setSelectionModel] = useState([]);
  const [busy, setBusy] = useState(false);

  // Eligible posts (for the Advertisement / Job Post switcher) + filters,
  // same debounced single-card pattern as the Verification Queue page.
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = useState(DEFAULT_FILTERS);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await AdvertisementApi.getAll(1, { per_page: 200, results_only: true });
        const advertisements = res.data?.data || res.data || [];
        const flatJobs = advertisements.flatMap((adv) =>
          (adv.job_details || adv.jobDetails || []).map((job) => ({ ...job, adv }))
        );
        setJobs(flatJobs.filter((job) => ELIGIBLE_STATUSES.includes(job.result_status)));
      } catch (err) {
        toast.error(err.message || 'Failed to load posts');
      }
    };
    fetchJobs();
  }, []);

  // Keep the Advertisement filter in sync with whichever post is actually
  // open (via the URL's :jobId), without fighting the user's own pick.
  useEffect(() => {
    const current = jobs.find((j) => getJobRouteId(j) === jobId);
    const advNo = current?.adv?.adv_number;
    if (advNo && advNo !== filters.adv_number) {
      setFilters((prev) => ({ ...prev, adv_number: advNo }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, jobId]);

  const advertisementOptions = useMemo(() => {
    const seen = new Map();
    jobs.forEach((j) => {
      const advNo = j.adv?.adv_number;
      if (advNo && !seen.has(advNo)) seen.set(advNo, `${advNo}`);
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [jobs]);

  const jobPostOptions = useMemo(() => {
    const scoped = filters.adv_number ? jobs.filter((j) => j.adv?.adv_number === filters.adv_number) : jobs;
    return scoped.map((j, idx) => {
      const val = getJobRouteId(j) || (j.id ? j.id.toString() : '') || idx;
      return { value: val, label: `${j.designation} (Adv: ${j.adv?.adv_number || 'N/A'})` };
    });
  }, [jobs, filters.adv_number]);

  const filterConfig = useMemo(() => [
    { name: 'search', label: 'Search', type: 'text', placeholder: 'Candidate name, roll number, CNIC...' },
    { name: 'adv_number', label: 'Advertisement', type: 'select', options: advertisementOptions },
  ], [advertisementOptions]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));

    if (name === 'adv_number' && value) {
      const stillValid = jobs.some((j) => getJobRouteId(j) === jobId && j.adv?.adv_number === value);
      if (!stillValid) {
        const firstMatch = jobs.find((j) => j.adv?.adv_number === value);
        if (firstMatch) navigate(`/dashboard/results/post-result/${getJobRouteId(firstMatch)}`, { replace: true });
      }
    }
  };

  const handleClearFilters = () => setFilters(DEFAULT_FILTERS);

  const handleJobPostChange = (e) => {
    const newJobId = e.target.value;
    if (newJobId && newJobId !== jobId) {
      navigate(`/dashboard/results/post-result/${newJobId}`);
    }
  };

  // Interview phases (loaded once per job, used by both the Interview and
  // Award List tabs for phase filtering/assignment).
  const [phases, setPhases] = useState([]);
  const [phasesLoading, setPhasesLoading] = useState(false);
  const [newPhase, setNewPhase] = useState(EMPTY_NEW_PHASE);

  // Onboarding tab has two sub-views: candidates eligible to start, and
  // candidates already started/onboarded (who need the "Mark Onboarded" action).
  const [onboardingView, setOnboardingView] = useState('eligible');

  const idField = activeTab === 'passed' ? 'exam_result_id' : 'award_list_entry_id';

  const selectedIds = useMemo(() => (Array.isArray(selectionModel) ? selectionModel : []), [selectionModel]);

  const resetSelectionAndPage = () => { setSelectionModel([]); setPage(0); };

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search: debouncedFilters.search, per_page: pageSize, page: page + 1 };
      let res;
      switch (activeTab) {
        case 'passed': res = await PostResultApi.getPassedCandidates(jobId, params); break;
        case 'shortlisted': res = await PostResultApi.getShortlisted(jobId, params); break;
        case 'interview': res = await PostResultApi.getInterviewCandidates(jobId, params); break;
        case 'initial-rejection': res = await PostResultApi.getInitialRejections(jobId, params); break;
        case 'final-rejection': res = await PostResultApi.getFinalRejections(jobId, params); break;
        case 'award-list': res = await PostResultApi.getAwardList(jobId, params); break;
        case 'onboarding':
          res = onboardingView === 'eligible'
            ? await PostResultApi.getOnboardingEligible(jobId, params)
            : await PostResultApi.getOnboarding(jobId, params);
          break;
        default: res = null;
      }
      const payload = res?.data || {};
      setJobInfo(payload.job || null);
      const candidates = payload.candidates || {};
      const list = candidates.data || (Array.isArray(payload.candidates) ? payload.candidates : []) || [];
      setRows(list.map((r) => ({ id: r.award_list_entry_id ?? r.exam_result_id ?? r.sr_no, ...r })));
      setTotalCount(candidates.total ?? list.length ?? 0);
    } catch (err) {
      toast.error(err.message || 'Failed to load candidates');
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, jobId, page, pageSize, debouncedFilters.search, onboardingView]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const fetchPhases = useCallback(async () => {
    setPhasesLoading(true);
    try {
      const res = await PostResultApi.getInterviewPhases(jobId);
      setPhases(res?.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load interview phases');
    } finally {
      setPhasesLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (activeTab === 'interview' || activeTab === 'award-list') fetchPhases();
  }, [activeTab, fetchPhases]);

  const runAction = async (fn, successMsg) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fn();
      const processed = res?.data?.processed ?? res?.data?.assigned ?? res?.data?.published ?? res?.data?.count;
      toast.success(res?.message || (processed !== undefined ? `${processed} candidate(s) processed` : successMsg));
      resetSelectionAndPage();
      await fetchList();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  // ── Passed Candidates actions ──
  const handleShortlist = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDelete({
      title: 'Shortlist for Documents',
      message: `Shortlist ${selectedIds.length} candidate(s) for document verification?`,
      warning: 'They will move to the Selected/Shortlisted for Documents tab.',
      confirmLabel: 'Shortlist',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;
    await runAction(() => PostResultApi.shortlistForDocuments(jobId, selectedIds), 'Candidates shortlisted');
  };

  // ── Shortlisted for Documents actions ──
  const handleGenerateInterviewList = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDelete({
      title: 'Generate List for Shortlisted Interview',
      message: `Select ${selectedIds.length} candidate(s) for interview and generate draft call letters?`,
      warning: 'Call letters are created in draft — publish them from the Interview Candidates tab.',
      confirmLabel: 'Select for Interview',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;
    await runAction(() => PostResultApi.generateInterviewList(jobId, selectedIds), 'Candidates selected for interview');
  };

  const handleInitialRejection = async () => {
    if (selectedIds.length === 0) return;
    const reason = await confirmWithReason({ title: 'Initial Rejection', label: `Reason for rejecting ${selectedIds.length} candidate(s):`, confirmLabel: 'Reject' });
    if (!reason) return;
    await runAction(() => PostResultApi.generateInitialRejection(jobId, selectedIds, reason), 'Candidates initially rejected');
  };

  const handleFinalRejectionDirect = async () => {
    if (selectedIds.length === 0) return;
    const reason = await confirmWithReason({ title: 'Final Rejection', label: `This is a direct FINAL rejection for ${selectedIds.length} candidate(s). Reason:`, confirmLabel: 'Finally Reject' });
    if (!reason) return;
    await runAction(() => PostResultApi.generateFinalRejectionDirect(jobId, selectedIds, reason), 'Candidates finally rejected');
  };

  // ── Initial Rejection actions ──
  const handleReselect = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDelete({
      title: 'Reselect Candidates',
      message: `Move ${selectedIds.length} candidate(s) back to Selected/Shortlisted for Documents?`,
      confirmLabel: 'Reselect',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;
    await runAction(() => PostResultApi.reselect(jobId, selectedIds), 'Candidates reselected');
  };

  const handleFinalRejectionFromInitial = async () => {
    if (selectedIds.length === 0) return;
    const reason = await confirmWithReason({ title: 'Generate Final Rejection', label: `Confirm/update the final rejection reason for ${selectedIds.length} candidate(s):`, confirmLabel: 'Finally Reject' });
    if (!reason) return;
    await runAction(() => PostResultApi.generateFinalRejectionFromInitial(jobId, selectedIds, reason), 'Candidates finally rejected');
  };

  // ── Award List actions ──
  const handleMarkCompleted = async () => {
    if (selectedIds.length === 0) return;
    await runAction(() => PostResultApi.markInterviewCompleted(jobId, selectedIds), 'Marked interview completed');
  };
  const handleSelectAfterInterview = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDelete({
      title: 'Select Successful Candidates',
      message: `Select ${selectedIds.length} candidate(s) as successful (eligible for onboarding)?`,
      confirmLabel: 'Select',
      confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;
    await runAction(() => PostResultApi.selectAfterInterview(jobId, selectedIds), 'Candidates selected');
  };

  // ── Onboarding actions ──
  const handleStartOnboarding = async () => {
    if (selectedIds.length === 0) return;
    await runAction(() => PostResultApi.startOnboarding(jobId, selectedIds), 'Onboarding started');
  };
  const handleCompleteOnboarding = async () => {
    if (selectedIds.length === 0) return;
    const ok = await confirmDelete({
      title: 'Mark Onboarded',
      message: `Mark ${selectedIds.length} candidate(s) as fully onboarded?`,
      confirmLabel: 'Mark Onboarded', confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;
    await runAction(() => PostResultApi.completeOnboarding(jobId, selectedIds), 'Candidates onboarded');
  };

  // ── Interview phase quick actions ──
  const handleCreatePhase = async () => {
    if (!newPhase.phase_name || !newPhase.interview_date) {
      toast.error('Phase name and interview date are required');
      return;
    }
    try {
      await PostResultApi.createInterviewPhase(jobId, { ...newPhase, capacity: newPhase.capacity || undefined });
      toast.success('Interview phase created');
      setNewPhase(EMPTY_NEW_PHASE);
      fetchPhases();
    } catch (err) {
      toast.error(err.message || 'Failed to create phase');
    }
  };

  const handleAssignToPhase = async (phaseId) => {
    if (selectedIds.length === 0) { toast.error('Select candidates first'); return; }
    await runAction(() => PostResultApi.assignToPhase(phaseId, selectedIds), 'Candidates assigned to phase');
  };

  const handlePublishPhase = async (phaseId) => {
    const ok = await confirmDelete({
      title: 'Publish Interview Phase',
      message: 'Publish this phase — call letters for its assigned candidates become visible on the Candidate Portal.',
      confirmLabel: 'Publish', confirmColor: 'bg-emerald-700 hover:bg-emerald-800',
    });
    if (!ok) return;
    try {
      const res = await PostResultApi.publishPhase(phaseId);
      toast.success(res?.message || 'Phase published');
      fetchPhases(); fetchList();
    } catch (err) { toast.error(err.message || 'Failed to publish phase'); }
  };

  const handleUnpublishPhase = async (phaseId) => {
    const ok = await confirmDelete({
      title: 'Unpublish Interview Phase',
      message: 'Hide this phase\'s call letters from candidates again?',
      confirmLabel: 'Unpublish', confirmColor: 'bg-amber-600 hover:bg-amber-700',
    });
    if (!ok) return;
    try {
      const res = await PostResultApi.unpublishPhase(phaseId);
      toast.success(res?.message || 'Phase unpublished');
      fetchPhases(); fetchList();
    } catch (err) { toast.error(err.message || 'Failed to unpublish phase'); }
  };

  const handleDownloadCallLetter = async (row) => {
    if (!row.call_letter_id) { toast.error('No call letter generated yet'); return; }
    try {
      await PostResultApi.downloadCallLetter(row.call_letter_id, `InterviewCallLetter_${row.roll_number || row.call_letter_id}.pdf`);
    } catch (err) { toast.error(err.message || 'Download failed'); }
  };

  const handleExport = async (format) => {
    const tabMap = { shortlisted: 'shortlisted', 'initial-rejection': 'initial-rejections', 'final-rejection': 'final-rejections' };
    const tab = tabMap[activeTab];
    if (!tab) return;
    try {
      await PostResultApi.exportList(jobId, tab, format, `${tab}_${jobId}`);
    } catch (err) { toast.error(err.message || 'Export failed'); }
  };

  // ── Column sets per tab ──
  const columns = useMemo(() => {
    const base = [
      { field: 'sr_no', headerName: 'Sr. No.', width: 80, sortable: false },
      textCol('roll_number', 'Roll Number', 0.8),
      textCol('candidate_name', 'Candidate Name', 1.4),
      textCol('district', 'District', 0.8),
      textCol('gender', 'Gender', 0.6),
    ];

    if (activeTab === 'passed') {
      return [
        ...base,
        numberCol('total_marks', 'Total Marks'),
        numberCol('obtained_marks', 'Obtained Marks'),
        numberCol('percentage', 'Percentage'),
      ];
    }
    if (activeTab === 'shortlisted') {
      return [
        ...base,
        numberCol('total_marks', 'Total Marks'),
        numberCol('obtained_marks', 'Obtained Marks'),
        numberCol('percentage', 'Percentage'),
        statusCol('current_status', 'Status', 0.8),
      ];
    }
    if (activeTab === 'interview') {
      return [
        ...base,
        numberCol('obtained_marks', 'Obtained Marks'),
        textCol('interview_phase_name', 'Interview Phase', 1),
        textCol('interview_date', 'Interview Date', 0.8),
        statusCol('call_letter_status', 'Call Letter Status', 1),
        {
          field: 'actions', headerName: 'Call Letter', width: 130, sortable: false,
          renderCell: (params) => (
            <button onClick={() => handleDownloadCallLetter(params.row)} className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 text-xs font-semibold">
              <Download size={14} /> PDF
            </button>
          ),
        },
      ];
    }
    if (activeTab === 'initial-rejection' || activeTab === 'final-rejection') {
      return [
        ...base,
        numberCol('total_marks', 'Total Marks'),
        numberCol('obtained_marks', 'Obtained Marks'),
        numberCol('percentage', 'Percentage'),
        textCol('rejection_reason', 'Rejection Reason', 1.6),
        textCol(activeTab === 'initial-rejection' ? 'rejection_date' : 'final_rejection_date', activeTab === 'initial-rejection' ? 'Rejection Date' : 'Final Rejection Date', 0.8),
        statusCol('current_status', 'Status', 0.8),
      ];
    }
    if (activeTab === 'award-list') {
      return [
        ...base,
        numberCol('obtained_marks', 'Obtained Marks'),
        textCol('interview_phase', 'Interview Phase', 1),
        textCol('interview_date', 'Interview Date', 0.8),
        statusCol('call_letter_status', 'Call Letter Status', 0.9),
        statusCol('interview_award_status', 'Interview/Award Status', 1),
      ];
    }
    if (activeTab === 'onboarding') {
      return [...base, statusCol('post_result_status', 'Status', 0.9), statusCol('onboarding_status', 'Onboarding Status', 0.9)];
    }
    return base;
  }, [activeTab]);

  const renderBulkActions = () => {
    if (selectedIds.length === 0) return null;
    const wrap = (children) => (
      <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mb-3">
        <span className="text-sm font-semibold text-emerald-800 mr-2">{selectedIds.length} selected</span>
        {children}
      </div>
    );

    if (activeTab === 'passed') return wrap(<Button size="sm" onClick={handleShortlist} disabled={busy}>Select / Shortlist for Documents</Button>);

    if (activeTab === 'shortlisted') return wrap(<>
      <Button size="sm" onClick={handleGenerateInterviewList} disabled={busy}>Generate List for Shortlisted Interview</Button>
      <Button size="sm" variant="secondary" onClick={handleInitialRejection} disabled={busy}>Generate List for Initial Rejection</Button>
      <Button size="sm" variant="destructive" onClick={handleFinalRejectionDirect} disabled={busy}>Generate List for Final Rejection</Button>
    </>);

    if (activeTab === 'initial-rejection') return wrap(<>
      <Button size="sm" onClick={handleReselect} disabled={busy}>Reselect</Button>
      <Button size="sm" variant="destructive" onClick={handleFinalRejectionFromInitial} disabled={busy}>Generate Final Rejection</Button>
    </>);

    if (activeTab === 'interview') return wrap(
      <select onChange={(e) => e.target.value && handleAssignToPhase(e.target.value)} defaultValue=""
        className="text-xs border border-emerald-300 rounded-md px-2 py-1.5 bg-white">
        <option value="" disabled>Assign to phase…</option>
        {phases.map((p) => <option key={p.id} value={p.id}>{p.phase_name} — {p.interview_date}</option>)}
      </select>
    );

    if (activeTab === 'award-list') return wrap(<>
      <Button size="sm" variant="secondary" onClick={handleMarkCompleted} disabled={busy}>Mark Interview Completed</Button>
      <Button size="sm" onClick={handleSelectAfterInterview} disabled={busy}>Select Successful Candidates</Button>
    </>);

    if (activeTab === 'onboarding') return wrap(
      onboardingView === 'eligible'
        ? <Button size="sm" onClick={handleStartOnboarding} disabled={busy}>Start Onboarding</Button>
        : <Button size="sm" onClick={handleCompleteOnboarding} disabled={busy}>Mark Onboarded</Button>
    );

    return null;
  };

  const exportable = ['shortlisted', 'initial-rejection', 'final-rejection'].includes(activeTab);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard/results/post-result')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-500 hover:text-slate-900 border border-slate-200 bg-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="p-2 bg-emerald-50 rounded-lg"><ClipboardCheck size={22} className="text-emerald-700" /></div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Post-Result Processing</h1>
              <p className="text-sm text-slate-500 mt-1">{jobInfo?.designation || 'Loading post...'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="md" onClick={fetchList} disabled={loading}
              className="h-10 w-10 min-w-[2.5rem] p-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              title="Refresh" aria-label="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
            {exportable && (
              <>
                <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}><FileSpreadsheet size={14} className="mr-1" /> Export PDF</Button>
                <Button size="sm" variant="outline" onClick={() => handleExport('excel')}><FileSpreadsheet size={14} className="mr-1" /> Export Excel</Button>
              </>
            )}
          </div>
        </div>

        {/* INFO STRIP */}
        {jobInfo && (
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200">
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Active Post</span>
                <h3 className="text-base font-bold text-emerald-900">{jobInfo.designation}</h3>
              </div>
              <div className="px-4 py-2 bg-white rounded-lg text-center border border-emerald-200">
                <span className="block text-xs font-medium text-slate-500">Result Status</span>
                <span className="text-sm font-bold text-emerald-700">{jobInfo.result_status || '—'}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TABS */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200">
          {TABS.map((t) => (
            <button key={t.id}
              onClick={() => { setActiveTab(t.id); resetSelectionAndPage(); }}
              className={`px-3.5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
                activeTab === t.id ? 'border-emerald-700 text-emerald-800 bg-emerald-50' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* FILTERS — Search, Advertisement & Job Post all in one card */}
        <AdvancedFilter
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
          filterConfig={filterConfig}
          title="Filter Candidates"
          extraFilters={
            <SearchableSelect
              label="Job Post"
              value={jobId}
              onChange={handleJobPostChange}
              options={jobPostOptions}
              placeholder="All Job Posts"
            />
          }
        />

        {activeTab === 'interview' && (
        <Card className="rounded-lg">
          <CardContent className="space-y-5 p-5">
            <StepHeader
              title="Interview Phase Allocation"
              subtitle="Configure interview batches, then allocate selected candidates to a phase — all interviews are held at a single fixed venue."
            />

            {/* ── Stat cards — same 3-card convention as Roll Number Center Allocation ── */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="rounded-lg border-blue-200 bg-blue-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Users size={24} className="text-blue-700" />
                  <div><p className="text-xs font-semibold text-blue-700">Selected Candidates</p><p className="text-2xl font-bold text-blue-950">{selectedIds.length}</p></div>
                </CardContent>
              </Card>
              <Card className="rounded-lg border-emerald-200 bg-emerald-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Calendar size={24} className="text-emerald-700" />
                  <div><p className="text-xs font-semibold text-emerald-700">Phases Created</p><p className="text-2xl font-bold text-emerald-950">{phases.length}</p></div>
                </CardContent>
              </Card>
              <Card className="rounded-lg border-violet-200 bg-violet-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <CheckCircle2 size={24} className="text-violet-700" />
                  <div><p className="text-xs font-semibold text-violet-700">Total Assigned</p><p className="text-2xl font-bold text-violet-950">{phases.reduce((sum, p) => sum + (p.call_letters_count ?? 0), 0)}</p></div>
                </CardContent>
              </Card>
            </div>

            {/* ── Fixed venue notice — no center-selection step needed, unlike Roll Number's multi-center allocation ── */}
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <MapPin size={16} className="text-emerald-700 flex-shrink-0" />
              Interview Venue (fixed for every phase): {INTERVIEW_VENUE}
            </div>

            {/* ── Create phase — same bordered schedule-card style as Roll Number's Schedule section ── */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center gap-2">
                <Calendar size={17} className="text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-900">Create New Interview Phase / Batch</h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="sm:col-span-3 lg:col-span-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Phase / Batch Name *</label>
                  <input placeholder="e.g. Batch 1" value={newPhase.phase_name}
                    onChange={(e) => setNewPhase((p) => ({ ...p, phase_name: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Interview Date *</label>
                  <input type="date" value={newPhase.interview_date}
                    onChange={(e) => setNewPhase((p) => ({ ...p, interview_date: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Reporting Time</label>
                  <input type="time" value={newPhase.reporting_time}
                    onChange={(e) => setNewPhase((p) => ({ ...p, reporting_time: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Interview Time</label>
                  <input type="time" value={newPhase.interview_time}
                    onChange={(e) => setNewPhase((p) => ({ ...p, interview_time: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500">Capacity (optional)</label>
                  <input type="number" min="1" placeholder="Unlimited" value={newPhase.capacity}
                    onChange={(e) => setNewPhase((p) => ({ ...p, capacity: e.target.value }))}
                    className="w-full text-sm border border-slate-300 rounded-md px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" onClick={handleCreatePhase}><Plus size={14} className="mr-1" /> Add Phase</Button>
              </div>
            </div>

            {/* ── Phases table — same layout convention as Roll Number's center-allocation table ── */}
            {phasesLoading ? <InlineLoader size="sm" /> : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Phase / Batch</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Reporting</th>
                      <th className="px-4 py-3">Interview Time</th>
                      <th className="px-4 py-3 text-right">Capacity</th>
                      <th className="px-4 py-3 text-right">Assigned</th>
                      <th className="px-4 py-3 text-right">Remaining</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {phases.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No interview phases created yet.</td></tr>
                    )}
                    {phases.map((p) => {
                      const assigned = p.call_letters_count ?? 0;
                      const hasCapacity = p.capacity !== null && p.capacity !== undefined;
                      const remaining = hasCapacity ? Math.max(0, p.capacity - assigned) : null;
                      const isFull = hasCapacity && remaining === 0;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-800">{p.phase_name}</p>
                            {p.interview_day && <p className="text-xs text-slate-400">{p.interview_day}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{p.interview_date || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{p.reporting_time || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{p.interview_time || '—'}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{hasCapacity ? p.capacity : 'Unlimited'}</td>
                          <td className="px-4 py-3 text-right font-medium text-blue-600">{assigned}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700">{hasCapacity ? remaining : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <StatusPill value={p.status} />
                              {hasCapacity && (
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isFull ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                  {isFull ? 'Full' : 'Available'}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {p.status === 'published' ? (
                              <button onClick={() => handleUnpublishPhase(p.id)} className="text-amber-600 hover:text-amber-800" title="Unpublish"><EyeOff size={16} /></button>
                            ) : (
                              <button onClick={() => handlePublishPhase(p.id)} className="text-emerald-600 hover:text-emerald-800" title="Publish"><Eye size={16} /></button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'onboarding' && (
        <div className="flex gap-2">
          {[{ id: 'eligible', label: 'Eligible to Start' }, { id: 'all', label: 'In Progress / Onboarded' }].map((v) => (
            <button key={v.id}
              onClick={() => { setOnboardingView(v.id); resetSelectionAndPage(); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                onboardingView === v.id ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-600 border-slate-200'
              }`}>
              {v.label}
            </button>
          ))}
        </div>
      )}

        {/* BULK BAR */}
        {renderBulkActions()}

        {/* GRID */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="p-10 flex justify-center">
              <InlineLoader text="Loading candidates..." variant="ring" size="lg" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">No Candidate Records</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">No candidates matched your active filters or search criteria for this tab.</p>
              </div>
            </div>
          ) : (
            <TooltipDataGrid
              sx={gridSx}
              rows={rows}
              columns={columns}
              checkboxSelection
              rowSelectionModel={selectionModel}
              onRowSelectionModelChange={(m) => setSelectionModel(m)}
              paginationMode="server"
              rowCount={totalCount}
              paginationModel={{ page, pageSize }}
              onPaginationModelChange={(m) => { setPage(m.page); setPageSize(m.pageSize); }}
              pageSizeOptions={[10, 25, 50, 100]}
              disableRowSelectionOnClick
              autoHeight
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default PostResultWorkflow;
