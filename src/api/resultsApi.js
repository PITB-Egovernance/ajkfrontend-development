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
 * Handle File/Blob response
 */
const handleBlobResponse = async (response) => {
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.message || result.error || 'Download failed');
    error.status = response.status;
    throw error;
  }
  return response.blob();
};

/**
 * Results API methods
 */
const ResultsApi = {
  /**
   * Submit manual mark entry
   */
  submitMarks: async (data) => {
    const response = await fetch(`${API_BASE}/results/marks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Import results via CSV
   */
  importCSV: async (formData, dryRun = false) => {
    const token = AuthService.getToken();
    const headers = {
      'Accept': 'application/json',
      'X-API-KEY': API_KEY,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (dryRun) {
      formData.append('dry_run', '1');
    }

    const response = await fetch(`${API_BASE}/results/import`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    return handleResponse(response);
  },

  /**
   * Download CSV Template for Result Import
   */
  downloadTemplate: async () => {
    const response = await fetch(`${API_BASE}/results/import/template`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleBlobResponse(response);
  },

  /**
   * Get Award List for a job post
   */
  getAwards: async (jobPostId) => {
    const response = await fetch(`${API_BASE}/results/awards?job_post_id=${jobPostId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Submit Award List (Interview marks)
   */
  submitAwards: async (data) => {
    const response = await fetch(`${API_BASE}/results/awards`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Update Merit/Replacement data
   */
  updateMerit: async (data) => {
    const response = await fetch(`${API_BASE}/results/merit`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Publish results for a job post
   */
  publish: async (data) => {
    const response = await fetch(`${API_BASE}/results/publish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Withdraw published results
   */
  withdraw: async (jobPostId, reason) => {
    const response = await fetch(`${API_BASE}/results/publish/${jobPostId}/withdraw`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },

  /**
   * Download Gazette PDF
   */
  downloadGazette: async (jobPostId) => {
    const response = await fetch(`${API_BASE}/results/publish/${jobPostId}/pdf`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleBlobResponse(response);
  },

  /**
   * Search candidate results
   */
  searchResults: async (params) => {
    const response = await fetch(`${API_BASE}/results/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    return handleResponse(response);
  },

  /**
   * Download Individual Result Slip
   */
  downloadSlip: async (resultId) => {
    const response = await fetch(`${API_BASE}/results/slip/${resultId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleBlobResponse(response);
  },

  /**
   * Reveal masked CNIC
   */
  unmaskCnic: async (resultId, reason) => {
    const response = await fetch(`${API_BASE}/results/${resultId}/unmask-cnic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(response);
  },
};

export default ResultsApi;
