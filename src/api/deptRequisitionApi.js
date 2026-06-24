import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;
const API_KEY = Config.apiKey;

// All department requisition endpoints are namespaced under /department/requisitions
const REQ_BASE = `${API_BASE}/department/requisitions`;

const getHeaders = (includeContentType = true) => {
  const token = AuthService.getToken();
  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': API_KEY,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (includeContentType) headers['Content-Type'] = 'application/json';
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

const DeptRequisitionApi = {
  getAll: async (page = 1, perPage = 10) => {
    const response = await fetch(
      `${REQ_BASE}?page=${page}&per_page=${perPage}`,
      { method: 'GET', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  getById: async (id) => {
    const response = await fetch(
      `${REQ_BASE}/${id}`,
      { method: 'GET', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  getForEdit: async (id) => {
    const response = await fetch(
      `${REQ_BASE}/edit/${id}`,
      { method: 'GET', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  getPreview: async (tempId) => {
    const response = await fetch(
      `${REQ_BASE}/preview/${tempId}`,
      { method: 'GET', headers: getHeaders(false) }
    );
    return handleResponse(response);
  },

  getForm: async (tempId) => {
    const response = await fetch(
      `${REQ_BASE}/form${tempId ? `?temp_id=${tempId}` : ''}`,
      { method: 'GET', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  create: async (data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(
      `${REQ_BASE}/store`,
      {
        method: 'POST',
        headers: getHeaders(!isFormData),
        body: isFormData ? data : JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  updateJob: async (id, data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(
      `${REQ_BASE}/${id}/update-job`,
      { method: 'POST', headers: getHeaders(!isFormData), body: isFormData ? data : JSON.stringify(data) }
    );
    return handleResponse(response);
  },

  updateCriteria: async (id, data) => {
    const response = await fetch(
      `${REQ_BASE}/${id}/update/criteria`,
      { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }
    );
    return handleResponse(response);
  },

  updateEligibility: async (id, data) => {
    const response = await fetch(
      `${REQ_BASE}/${id}/update-eligibility`,
      { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) }
    );
    return handleResponse(response);
  },

  confirm: async (tempId) => {
    const response = await fetch(
      `${REQ_BASE}/confirm/${tempId}`,
      { method: 'POST', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  submitToAdmin: async (id) => {
    const response = await fetch(
      `${REQ_BASE}/submit-to-admin/${id}`,
      { method: 'POST', headers: getHeaders() }
    );
    return handleResponse(response);
  },

  upload: async (formData) => {
    const token = AuthService.getToken();
    const headers = { 'Accept': 'application/json', 'X-API-KEY': API_KEY };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(
      `${REQ_BASE}/upload`,
      { method: 'POST', headers, body: formData }
    );
    return handleResponse(response);
  },

  delete: async (id) => {
    const response = await fetch(
      `${REQ_BASE}/${id}`,
      { method: 'DELETE', headers: getHeaders() }
    );
    return handleResponse(response);
  },
};

export default DeptRequisitionApi;