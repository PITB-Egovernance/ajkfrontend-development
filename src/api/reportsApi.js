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
};

export default ReportsApi;
