import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';

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
 * Advertisement API methods
 */
const AdvertisementApi = {
  /**
   * Get all advertisements with pagination
   */
  getAll: async (page = 1) => {
    const response = await fetch(`${API_BASE}/advertisements?page=${page}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get a single advertisement by ID
   */
  getById: async (id) => {
    const response = await fetch(`${API_BASE}/advertisements/${id}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get global advertisement notes
   */
  getNotes: async () => {
    const response = await fetch(`${API_BASE}/advertisements/notes`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get approved requisitions available for advertisement
   */
  getApprovedRequisitions: async () => {
    const response = await fetch(`${API_BASE}/advertisements/approved-requisitions`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Create a new advertisement
   */
  create: async (data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE}/advertisements/store`, {
      method: 'POST',
      headers: getHeaders(!isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Update an existing advertisement
   */
  update: async (id, data) => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE}/advertisements/${id}/update`, {
      method: 'PUT',
      headers: getHeaders(!isFormData),
      body: isFormData ? data : JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Delete an advertisement
   */
  delete: async (id) => {
    const response = await fetch(`${API_BASE}/advertisements/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  /**
   * Save global notes
   */
  saveNotes: async (data) => {
    const response = await fetch(`${API_BASE}/advertisements/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  }
};

export default AdvertisementApi;
