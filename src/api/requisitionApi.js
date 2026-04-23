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
    console.log('temp ID', tempId)
    const response = await fetch(
      `${API_BASE}/requisitions/preview/${tempId}`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );
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
