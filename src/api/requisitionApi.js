import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;
const API_KEY = Config.apiKey;

/**
 * Get headers with authentication
 */
const getHeaders = (includeContentType = true) => {
  const token = AuthService.getToken();
  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': API_KEY,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

/**
 * Handle API response
 */
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

/**
 * Requisition API methods
 */
const RequisitionApi = {
  /**
   * Get all requisitions with pagination
   */
  getAll: async (page = 1, perPage = 10) => {
    const response = await fetch(
      `${API_BASE}/requisitions?page=${page}&per_page=${perPage}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  /**
   * Get a single requisition by ID
   */
  getById: async (id) => {
    const response = await fetch(
      `${API_BASE}/requisitions/${id}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  /**
   * Get requisition for editing
   */
  getForEdit: async (id) => {
    const response = await fetch(
      `${API_BASE}/requisitions/edit/${id}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  /**
   * Get requisition preview by temp ID
   */
  getPreview: async (tempId) => {
    const response = await fetch(
      `${API_BASE}/requisitions/preview/${tempId}`,
      {
        method: 'GET',
        headers: getHeaders(false),
      }
    );
    // Special case: 200 + HTML from the live API means the live nginx is
    // serving the SPA shell instead of routing the GET to Laravel (same root
    // cause as the SPA-fallback 200s we see on POST). The route IS registered
    // (curl with the same URL returns 401 JSON when no auth is present), so
    // the only explanation is a content-type / cookie / route-pattern
    // misconfiguration on the live server. Surface this clearly so the user
    // knows it's a server issue, not a code bug.
    const ct = response.headers.get('content-type') || '';
    if (response.status === 200 && ct.includes('text/html')) {
      const text = await response.text();
      const isSpaShell = /<title>AJKPSC Admin<\/title>/i.test(text)
        || /<div id="root"><\/div>/i.test(text)
        || /static\/js\/bundle\.js/i.test(text);
      if (isSpaShell) {
        throw new Error(
          'Live server is returning the admin frontend HTML instead of the API response for the preview GET. ' +
          'The live nginx config is misrouting /api/v1/requisitions/preview/{tempId} to the SPA. ' +
          'The backend team must fix the nginx try_files / location rules so GETs to /api/v1/* reach Laravel. ' +
          'Until then, the preview cannot load — but the requisition data was already saved when you submitted each step.'
        );
      }
    }
    return handleResponse(response);
  },

  /**
   * Get form data by temp ID
   */
  getForm: async (tempId) => {
    const response = await fetch(
      `${API_BASE}/requisitions/form?temp_id=${tempId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  /**
   * Create/store a new requisition
   */
  create: async (data) => {
    const isFormData = data instanceof FormData;
    const headers = getHeaders(!isFormData); // Do not add Content-Type for FormData

    const response = await fetch(
      `${API_BASE}/requisitions/store`,
      {
        method: 'POST',
        headers: headers,
        body: isFormData ? data : JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  /**
   * Update job information
   */
  updateJob: async (id, data) => {
    const response = await fetch(
      `${API_BASE}/requisitions/${id}/update-job`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  /**
   * Update criteria
   */
  updateCriteria: async (id, data) => {
    const response = await fetch(
      `${API_BASE}/requisitions/${id}/update-criteria`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  /**
   * Update eligibility
   */
  updateEligibility: async (id, data) => {
    const response = await fetch(
      `${API_BASE}/requisitions/${id}/update-eligibility`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return handleResponse(response);
  },

  /**
   * Confirm requisition
   */
  confirm: async (tempId) => {
    const response = await fetch(
      `${API_BASE}/requisitions/confirm/${tempId}`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },

  /**
   * Upload requisition file
   */
  upload: async (formData) => {
    const token = AuthService.getToken();
    const headers = {
      'Accept': 'application/json',
      'X-API-KEY': API_KEY,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE}/requisitions/upload`,
      {
        method: 'POST',
        headers: headers,
        body: formData,
      }
    );
    return handleResponse(response);
  },

  /**
   * Delete a requisition
   */
  delete: async (id) => {
    const response = await fetch(
      `${API_BASE}/requisitions/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );
    return handleResponse(response);
  },
};

export default RequisitionApi;
