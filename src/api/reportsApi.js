import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import {
  interviewShortlistRows,
  awardListInterviewRows,
  interviewScheduleApiRows,
  interviewMarksCompilationApiRows,
  combinedMeritApiRows,
  INTERVIEW_BOARDS,
  INTERVIEW_SCHEDULE_STATUSES,
  EVALUATION_STATUSES,
  FINAL_MERIT_STATUSES,
  grievanceComplaintApiRows,
  vacancyFunnelApiRows,
  COMPLAINT_TYPES,
  COMPLAINT_STATUSES,
} from 'pages/reports/mockData';
const API_BASE = Config.apiUrl;
const API_KEY  = Config.apiKey;

const getHeaders = () => ({
  Accept:        'application/json',
  'X-API-KEY':   API_KEY,
  Authorization: `Bearer ${AuthService.getToken()}`,
});

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error  = new Error(result.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }
  return result;
};

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      search.set(key, value);
    }
  });
  return search.toString();
};

const get = async (path, params = {}) => {
  const qs = buildQuery(params);
  const res = await fetch(`${API_BASE}${path}${qs ? `?${qs}` : ''}`, { headers: getHeaders() });
  return handleResponse(res);
};

// Marks & Result Reports — still mock-backed until the real endpoints exist.
// Every method returns the same { success, data } envelope the live
// endpoints below use, so swapping a method body for a real fetch() call
// later will not require any change in the pages that consume it.
const MOCK_LATENCY_MS = 500;

const resolveAfter = (data) =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true, data }), MOCK_LATENCY_MS));

// Shared by every mock report that filters on the common
// Advertisement / Post / Gender / District quartet (merit list, top marks
// merit, candidate rejection, final rejected candidates).
const applyStandardCandidateFilters = (rows, filters = {}) =>
  rows.filter((r) => {
    if (filters.advertisementNo && r.advertisementNo !== filters.advertisementNo) return false;
    if (filters.post && r.post !== filters.post) return false;
    if (filters.gender && r.gender !== filters.gender) return false;
    if (filters.district && r.district !== filters.district) return false;
    return true;
  });

// ── Interview / Viva + Administrative & Audit Reports — mock-backed,
// snake_case rows (see mockData.js) ──
const toOptions = (arr) => arr.map((v) => ({ value: v, label: v }));

// Shared by every report that filters on the Advertisement / Post / Status
// trio (interview schedule, interview marks compilation, grievance tracking).
const applyAdvertisementPostStatusFilters = (rows, p = {}) =>
  rows.filter((r) => {
    if (p.advertisement && r.advertisement_no !== p.advertisement) return false;
    if (p.post_name && r.post !== p.post_name) return false;
    if (p.status && r.status !== p.status) return false;
    return true;
  });

const applyCombinedMeritFilters = (rows, p = {}) =>
  rows.filter((r) => {
    if (p.advertisement && r.advertisement_no !== p.advertisement) return false;
    if (p.post_name && r.post !== p.post_name) return false;
    if (p.gender && r.gender !== p.gender) return false;
    if (p.status && r.final_merit_status !== p.status) return false;
    return true;
  });

// Applies a free-text `search` across every field, then slices the page the
// grid asked for. Mirrors what a real paginated endpoint would do server-side.
const paginateAndSearch = (rows, params = {}) => {
  let searched = rows;
  if (params.search) {
    const term = String(params.search).trim().toLowerCase();
    if (term) {
      searched = searched.filter((r) =>
        Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(term))
      );
    }
  }
  const total = searched.length;
  const page = Number(params.page) || 1;
  const perPage = Number(params.per_page) || total || 1;
  const start = (page - 1) * perPage;
  return { pageRows: searched.slice(start, start + perPage), total, searched };
};

const computeMarksCompilationStats = (rows) => {
  const completed = rows.filter((r) => r.status === 'Completed' && r.interview_marks !== null);
  const marks = completed.map((r) => r.interview_marks);
  return {
    total_candidates: rows.length,
    average_marks: marks.length ? Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 100) / 100 : 0,
    highest_marks: marks.length ? Math.max(...marks) : 0,
    lowest_marks: marks.length ? Math.min(...marks) : 0,
    completed_evaluations: completed.length,
    pending_evaluations: rows.filter((r) => r.status === 'Pending').length,
  };
};

const FUNNEL_STAGE_KEYS = ['vacancies', 'applications_received', 'eligible', 'written_qualified', 'interview_qualified', 'selected'];
const computeFunnelTotals = (rows) =>
  FUNNEL_STAGE_KEYS.reduce((totals, key) => {
    totals[key] = rows.reduce((sum, r) => sum + (r[key] || 0), 0);
    return totals;
  }, {});

// Reporting & Analytics module — all filtering/pagination happens server-side
// (see ReportController/MarksReportController on the backend); pass every
// active filter here rather than fetching everything and filtering
// client-side.
const ReportsApi = {
  // ── Application & Candidate / Examination Logistics reports ──
  getFilters: async () => get('/reports/filters'),
  getApplicationSummary: async (params = {}) => get('/reports/application-summary', params),
  getCenterWiseCandidates: async (params = {}) => get('/reports/center-wise-candidates', params),
  getCandidateDistribution: async (params = {}) => get('/reports/candidate-distribution', params),

  // ── Marks & Result reports (see MarksReportController) ──
  /** Subject/category dropdown options specific to this module (written subjects, CCE optional subjects, quota categories). */
  getMarksFilters: async () => get('/reports/marks-filters'),

  /** Compiled Marksheet (Written Exam) — subject-wise rows per candidate. */
  getWrittenMarksheet: async (params = {}) => get('/reports/marksheet-written', params),

  /** Compiled Marksheet (CCE) — one row per candidate. */
  getCceMarksheet: async (params = {}) => get('/reports/marksheet-cce', params),

  /** Pass / Fail Statistics Report — stat cards, charts, and table view all derive from this single summary object. */
  getPassFailStatistics: async (params = {}) => get('/reports/pass-fail-statistics', params),

  /** Merit List (Category Wise) — ranked within each (advertisement, post) group. */
  getMeritList: async (params = {}) => get('/reports/merit-list', params),

  /** Tie-Breaking Report — candidates sharing an aggregate within the same post. */
  getTieBreaking: async (params = {}) => get('/reports/tie-breaking', params),

  /** Import Discrepancy Report — re-imports whose marks conflicted with an already-recorded result. */
  getImportDiscrepancy: async (params = {}) => get('/reports/import-discrepancy', params),

  /** Top Marks Merit Candidate List — highest scorers within each post's vacancy count. */
  getTopMarksMerit: async (params = {}) => get('/reports/top-marks-merit', params),

  /** Candidate Rejection List — candidates rejected at document verification. */
  getCandidateRejectionList: async (params = {}) => get('/reports/candidate-rejection-list', params),

  /** Final Rejected Candidate List — rejections upheld after appeal. */
  getFinalRejectedCandidates: async (params = {}) => get('/reports/final-rejected-candidates', params),

  /**
   * Interview Shortlisting List — candidates shortlisted for interview.
   */
  getInterviewShortlist: async (filters = {}) => resolveAfter({
    rows: applyStandardCandidateFilters(interviewShortlistRows, filters),
  }),

  /**
   * Award List for Interview — final interview award list.
   */
  getAwardListInterview: async (filters = {}) => resolveAfter({
    rows: applyStandardCandidateFilters(awardListInterviewRows, filters),
  }),

  // ── Interview / Viva Reports ──
  /** Interview board / status dropdown options specific to this module. */
  getInterviewFilters: async () => resolveAfter({
    interview_boards: toOptions(INTERVIEW_BOARDS),
    interview_statuses: toOptions(INTERVIEW_SCHEDULE_STATUSES),
    evaluation_statuses: toOptions(EVALUATION_STATUSES),
    merit_statuses: toOptions(FINAL_MERIT_STATUSES),
  }),

  /** Interview Schedule — candidate-to-board/date/venue assignments. */
  getInterviewSchedule: async (params = {}) => {
    const filtered = applyAdvertisementPostStatusFilters(interviewScheduleApiRows, params);
    const { pageRows, total } = paginateAndSearch(filtered, params);
    return resolveAfter({ data: pageRows, total });
  },

  /** Interview Marks Compilation — marks awarded by interview boards, plus summary stats. */
  getInterviewMarksCompilation: async (params = {}) => {
    const filtered = applyAdvertisementPostStatusFilters(interviewMarksCompilationApiRows, params);
    const { pageRows, total, searched } = paginateAndSearch(filtered, params);
    return resolveAfter({ data: pageRows, total, stats: computeMarksCompilationStats(searched) });
  },

  /** Combined Merit (Written + Interview) — final weighted merit list. */
  getCombinedMerit: async (params = {}) => {
    const filtered = applyCombinedMeritFilters(combinedMeritApiRows, params);
    const { pageRows, total } = paginateAndSearch(filtered, params);
    return resolveAfter({ data: pageRows, total });
  },

  // ── Administrative & Audit Reports ──
  /** Complaint type / status dropdown options specific to this module. */
  getAdminAuditFilters: async () => resolveAfter({
    complaint_types: toOptions(COMPLAINT_TYPES),
    complaint_statuses: toOptions(COMPLAINT_STATUSES),
  }),

  /** Grievance / Complaint Tracking — candidate complaints and appeal status. */
  getGrievanceComplaints: async (params = {}) => {
    const filtered = applyAdvertisementPostStatusFilters(grievanceComplaintApiRows, params);
    const { pageRows, total } = paginateAndSearch(filtered, params);
    return resolveAfter({ data: pageRows, total });
  },

  /**
   * Vacancy-to-Selection Funnel — one row per (advertisement, post) posting.
   * Small, unpaginated dataset (a handful of postings per cycle), returned
   * with pre-computed totals for the summary cards and funnel/bar charts.
   */
  getVacancySelectionFunnel: async () => resolveAfter({
    data: vacancyFunnelApiRows,
    totals: computeFunnelTotals(vacancyFunnelApiRows),
  }),
};

export default ReportsApi;
