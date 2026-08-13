import Config from 'config/baseUrl';
import AuthService from 'services/authService';
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

  /** Interview Shortlisting List — candidates shortlisted for interview. */
  getInterviewShortlist: async (params = {}) => get('/reports/interview-shortlist', params),

  /** Award List for Interview — final interview award list. */
  getAwardListInterview: async (params = {}) => get('/reports/award-list-interview', params),

  // ── Interview / Viva Reports (see MarksReportController) ──
  /** Interview status / evaluation status / merit status dropdown options specific to this module. */
  getInterviewFilters: async () => get('/reports/interview-filters'),

  /** Interview Schedule — candidate-to-phase/date/venue assignments. */
  getInterviewSchedule: async (params = {}) => get('/reports/interview-schedule', params),

  /** Interview Marks Compilation — viva marks per candidate, plus summary stats. */
  getInterviewMarksCompilation: async (params = {}) => get('/reports/interview-marks-compilation', params),

  /** Combined Merit (Written + Interview) — final weighted merit list. */
  getCombinedMerit: async (params = {}) => get('/reports/combined-merit', params),

  // ── Administrative & Audit Reports (see AdminAuditReportController) ──
  /** Complaint status dropdown options specific to this module. */
  getAdminAuditFilters: async () => get('/reports/admin-audit-filters'),

  /** Grievance / Complaint Tracking — candidate complaints and appeal status. */
  getGrievanceComplaints: async (params = {}) => get('/reports/grievance-complaints', params),

  /**
   * Vacancy-to-Selection Funnel — one row per (advertisement, post) posting.
   * Small, unpaginated dataset (a handful of postings per cycle), returned
   * with pre-computed totals for the summary cards and funnel/bar charts.
   */
  getVacancySelectionFunnel: async () => get('/reports/vacancy-selection-funnel'),

  /**
   * Year-over-Year Comparison — one row per recruitment year. Small,
   * unpaginated dataset (a handful of years per commission term).
   */
  getYearOverYearComparison: async () => get('/reports/year-over-year-comparison'),

  /**
   * Category-wise Selection Ratio — one row per reservation/quota category.
   */
  getCategorySelectionRatio: async () => get('/reports/category-selection-ratio'),

  // ── Compliance & Public Reports (see MarksReportController) ──
  /** Examination / result status dropdown options specific to this module. */
  getComplianceFilters: async () => get('/reports/compliance-filters'),

  /**
   * Public Result Gazette — final, publishable result / merit list, plus
   * summary stats computed over the entire filtered (pre-pagination) set.
   */
  getPublicResultGazette: async (params = {}) => get('/reports/public-result-gazette', params),
};

export default ReportsApi;
