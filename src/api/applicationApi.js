import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { buildQueryString } from 'utils/apiUtils';

const CANDIDATE_API_BASE = Config.candidateApiUrl || `${Config.apiUrl}/admin`;
const CANDIDATE_API_KEY = Config.candidateApiKey || Config.apiKey;

const getHeaders = (includeContentType = true, includeAuth = false) => {
  const token = AuthService.getToken();
  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': CANDIDATE_API_KEY,
  };

  if (includeAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    const error = new Error(result.message || result.error || 'Request failed');
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }

  return result;
};

const ApplicationApi = {
  /**
   * Get all applications with pagination and filters
   * params: { page, job_id, status, start_date, end_date, search }
   */
  getAll: async (params = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const url = `${CANDIDATE_API_BASE}/applications${buildQueryString(filteredParams)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(true, false),
    });
    return handleResponse(response);
  },

  /**
   * Get a single application by ID
   */
  getById: async (id) => {
    const response = await fetch(`${CANDIDATE_API_BASE}/applications/${id}`, {
      method: 'GET',
      headers: getHeaders(true, false),
    });
    return handleResponse(response);
  },

  /**
   * Update the status of an application
   */
  updateStatus: async (id, status) => {
    const response = await fetch(`${CANDIDATE_API_BASE}/applications/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(true, false),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  /**
   * Bulk update status for multiple applications
   */
  bulkUpdateStatus: async (ids, status) => {
    const response = await fetch(`${CANDIDATE_API_BASE}/applications/bulk-status`, {
      method: 'PUT',
      headers: getHeaders(true, false),
      body: JSON.stringify({ ids, status }),
    });
    return handleResponse(response);
  }
};

export default ApplicationApi;
