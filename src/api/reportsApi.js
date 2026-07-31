// Marks & Result Reports API layer.
//
// Backed by static mock data (src/pages/reports/mockData.js) until the real
// endpoints exist. Every method already returns the { success, data }
// envelope + accepts the same filter shape the real API will use (see
// src/api/resultsApi.js for that convention), so swapping a method body for
// a real `fetch()` call later will not require any change in the pages that
// consume it.

import {
  writtenMarksheetRows,
  cceMarksheetRows,
  passFailStatistics,
} from 'pages/reports/mockData';

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

const reportsApi = {
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
};

export default reportsApi;
