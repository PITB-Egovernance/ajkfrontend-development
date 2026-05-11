import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { buildQueryString } from 'utils/apiUtils';

// Candidate portal — source of truth for rich candidate data (disability, education, documents, etc.)
const CANDIDATE_API_BASE = Config.candidateApiUrl || `${Config.apiUrl}/admin`;
const CANDIDATE_API_KEY  = Config.candidateApiKey  || Config.apiKey;

// Admin backend — source of truth for application status
const ADMIN_API_BASE = Config.apiUrl;
const ADMIN_API_KEY  = Config.apiKey;

const getCandidateHeaders = () => ({
  'Accept': 'application/json',
  'X-API-KEY': CANDIDATE_API_KEY,
});

const getAdminHeaders = () => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': ADMIN_API_KEY,
  'Authorization': `Bearer ${AuthService.getToken()}`,
});

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || result.error || 'Request failed');
    error.status  = response.status;
    error.errors  = result.errors || {};
    throw error;
  }
  return result;
};

// Low-level helper — returns the raw {application_number → admin_status} map, or {} on failure.
const fetchAdminStatuses = async (numbers) => {
  try {
    const res  = await fetch(
      `${ADMIN_API_BASE}/applications/statuses?numbers=${numbers.join(',')}`,
      { headers: getAdminHeaders() }
    );
    const json = await res.json();
    return json.success ? (json.data ?? {}) : {};
  } catch {
    return {};
  }
};

// Inject _admin_status into every item of a paginated list response.
const overlayAdminStatuses = async (result) => {
  const items   = result?.data?.data ?? [];
  const numbers = items.map((a) => a.application_number).filter(Boolean);
  if (!numbers.length) return result;

  const map = await fetchAdminStatuses(numbers);
  if (result.data?.data) {
    result.data.data = result.data.data.map((app) => ({
      ...app,
      _admin_status: map[app.application_number] ?? null,
    }));
  }
  return result;
};

const ApplicationApi = {
  // READ: candidate portal (disability, documents, education, preferred cities, etc.)
  // + admin status overlay so status persists across refreshes
  getAll: async (params = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const url = `${CANDIDATE_API_BASE}/applications${buildQueryString(filteredParams)}`;
    const response = await fetch(url, { method: 'GET', headers: getCandidateHeaders() });
    const result = await handleResponse(response);
    return overlayAdminStatuses(result);
  },

  // READ single application — candidate portal (full data) + admin status overlay.
  // preferred_exam_cities is now returned by the admin backend show() response,
  // so the old per_page=100 list fallback fetch has been removed.
  getById: async (id) => {
    const response = await fetch(`${CANDIDATE_API_BASE}/applications/${id}`, {
      method: 'GET',
      headers: getCandidateHeaders(),
    });
    const result = await handleResponse(response);

    // Resolve which object holds the application data
    const appData = result?.data?.application ?? result?.data ?? result;
    const appNum  = appData?.application_number;

    // Overlay admin status using the shared primitive (failure silently ignored).
    if (appNum) {
      const map = await fetchAdminStatuses([appNum]);
      appData._admin_status = map[appNum] ?? null;
    }

    return result;
  },

  // WRITE: admin backend — identified by application_number (shared key)
  updateStatus: async (applicationNumber, status) => {
    const response = await fetch(`${ADMIN_API_BASE}/applications/${applicationNumber}/status`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },

  bulkUpdateStatus: async (applicationNumbers, status) => {
    const response = await fetch(`${ADMIN_API_BASE}/applications/bulk-status`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({ ids: applicationNumbers, status }),
    });
    return handleResponse(response);
  },
};

export default ApplicationApi;
