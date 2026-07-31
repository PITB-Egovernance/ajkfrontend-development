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

// Reporting & Analytics module — all filtering/pagination happens server-side
// (see ReportController on the backend); pass every active filter here
// rather than fetching everything and filtering client-side.
const ReportsApi = {
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
};

export default ReportsApi;
