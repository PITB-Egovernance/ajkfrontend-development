import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import {
  writtenMarksheetRows,
  cceMarksheetRows,
  passFailStatistics,
  meritListRows,
  tieBreakingRows,
  importDiscrepancyRows,
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

// Marks & Result Reports — still mock-backed until the real endpoints exist.
// Every method returns the same { success, data } envelope the live
// endpoints below use, so swapping a method body for a real fetch() call
// later will not require any change in the pages that consume it.
const MOCK_LATENCY_MS = 500;

const resolveAfter = (data) =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true, data }), MOCK_LATENCY_MS));

const applyWrittenFilters = (rows, filters = {}) =>
  rows.filter((r) => {
    if (filters.advertisementNo && r.advertisementNo !== filters.advertisementNo) return false;
    if (filters.post && r.post !== filters.post) return false;
    if (filters.subject && r.subject !== filters.subject) return false;
    return true;
  });

const applyCceFilters = (rows, filters = {}) =>
  rows.filter((r) => {
    if (filters.advertisementNo && r.advertisementNo !== filters.advertisementNo) return false;
    if (filters.post && r.post !== filters.post) return false;
    if (filters.optionalSubject && !r.optionalSubjects.includes(filters.optionalSubject)) return false;
    return true;
  });

const applyMeritListFilters = (rows, filters = {}) =>
  rows.filter((r) => {
    if (filters.advertisementNo && r.advertisementNo !== filters.advertisementNo) return false;
    if (filters.post && r.post !== filters.post) return false;
    if (filters.gender && r.gender !== filters.gender) return false;
    if (filters.district && r.district !== filters.district) return false;
    return true;
  });

//const reportsApi = {
const ReportsApi = {
  // ── Application & Candidate / Examination Logistics reports — live API ──
  // (see ReportController on the backend); pass every active filter here
  // rather than fetching everything and filtering client-side.
  getFilters: async () => {
    const res = await fetch(`${API_BASE}/reports/filters`, { headers: getHeaders() });
    return handleResponse(res);
  },

  getApplicationSummary: async (params = {}) => {
    const res = await fetch(`${API_BASE}/reports/application-summary?${buildQuery(params)}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getCenterWiseCandidates: async (params = {}) => {
    const res = await fetch(`${API_BASE}/reports/center-wise-candidates?${buildQuery(params)}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  getCandidateDistribution: async (params = {}) => {
    const res = await fetch(`${API_BASE}/reports/candidate-distribution?${buildQuery(params)}`, {
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  // ── Marks & Result reports — mock-backed, see note above ──
  /**
   * Compiled Marksheet (Written Exam) — subject-wise rows per candidate.
   */
  getWrittenMarksheet: async (filters = {}) => resolveAfter({
    rows: applyWrittenFilters(writtenMarksheetRows, filters),
  }),

  /**
   * Compiled Marksheet (CCE) — one row per candidate.
   */
  getCceMarksheet: async (filters = {}) => resolveAfter({
    rows: applyCceFilters(cceMarksheetRows, filters),
  }),

  /**
   * Pass / Fail Statistics Report — stat cards, charts, and table view all
   * derive from this single summary object. `filters` is accepted now for
   * API-shape parity even though the mock summary itself is static.
   */
  getPassFailStatistics: async (filters = {}) => resolveAfter(passFailStatistics), // eslint-disable-line no-unused-vars

  /**
   * Merit List (Category Wise) — ranked within each (advertisement, post) group.
   */
  getMeritList: async (filters = {}) => resolveAfter({
    rows: applyMeritListFilters(meritListRows, filters),
  }),

  /**
   * Tie-Breaking Report — candidates sharing an aggregate; no filters yet
   * on the frontend, so the full curated set is returned as-is.
   */
  getTieBreaking: async () => resolveAfter({ rows: tieBreakingRows }),

  /**
   * Import Discrepancy Report — compares an imported batch against
   * previously recorded marks; no filters yet on the frontend.
   */
  getImportDiscrepancy: async () => resolveAfter({ rows: importDiscrepancyRows }),
}

export default ReportsApi;
