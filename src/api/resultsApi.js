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
  importCSV: async (formData, dryRun = false, page = 1) => {
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
    
    if (page) {
      formData.append('page', page.toString());
    }

    const response = await fetch(`${API_BASE}/results/import`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    return handleResponse(response);
  },

  /**
   * Finalize CSV import with hash validation
   */
  confirmImport: async (jobId, formData) => {
    const token = AuthService.getToken();
    const headers = {
      'Accept': 'application/json',
      'X-API-KEY': API_KEY,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/results/${jobId}/import/confirm`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    return handleResponse(response);
  },

  searchResult: async (jobPostId, query) => {
    const response = await fetch(`${API_BASE}/results/search?job_post_id=${jobPostId}&query=${query}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  downloadResultPDF: async (hashId, mode = 'unofficial') => {
    const response = await fetch(`${API_BASE}/results/${hashId}/print?mode=${mode}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleBlobResponse(response);
  },

  logUnmaskAudit: async (hashId) => {
    const response = await fetch(`${API_BASE}/results/${hashId}/unmask-audit`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Download CSV Template for Result Import
   */
  downloadTemplate: async (jobPostId = null) => {
    let url = `${API_BASE}/results/import/template`;
    if (jobPostId) {
      url += `?job_post_id=${jobPostId}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleBlobResponse(response);
  },

  /**
   * Get subject templates for a job post
   */
  getSubjectTemplates: async (jobPostId) => {
    const response = await fetch(`${API_BASE}/results/subjects/template?job_post_id=${jobPostId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get Award List for a job post
   */
  getAwards: async (jobPostId, district = 'all') => {
    const response = await fetch(`${API_BASE}/results/awards?job_post_id=${jobPostId}&district=${district}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Initialize Award List from eligible candidates
   */
  initializeAwards: async (data) => {
    const response = await fetch(`${API_BASE}/results/awards/initialize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * UC-R06: Update Award Status (Senior Admin)
   */
  updateAwardStatus: async (awardId, data) => {
    const response = await fetch(`${API_BASE}/results/awards/${awardId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * UC-R07: Trigger Merit Replacement (Senior Admin)
   */
  replaceAwardCandidate: async (awardId, data) => {
    const response = await fetch(`${API_BASE}/results/awards/${awardId}/replace`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Patch a single Award row (Auto-save)
   */
  patchAward: async (id, data, version) => {
    const headers = getHeaders();
    if (version !== undefined) {
      headers['If-Match'] = version.toString();
    }
    
    const response = await fetch(`${API_BASE}/results/awards/${id}`, {
      method: 'PATCH',
      headers: headers,
      body: JSON.stringify(data),
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
   * Get current publication status
   */
  getPublishStatus: async (jobPostId) => {
    const response = await fetch(`${API_BASE}/results/publish/${jobPostId}/status`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get publication readiness checklist
   */
  getPublicationChecklist: async (jobPostId) => {
    const response = await fetch(`${API_BASE}/results/publish/${jobPostId}/checklist`, {
      method: 'GET',
      headers: getHeaders(),
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
    // Validate reason is provided and has minimum length for audit trail
    if (!reason || reason.trim().length < 10) {
      throw new Error('Please provide a specific reason (at least 10 characters) for CNIC unmasking');
    }

    const response = await fetch(`${API_BASE}/results/${resultId}/unmask-cnic`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        reason: reason.trim(),
        timestamp: new Date().toISOString()
      }),
    });
    return handleResponse(response);
  },

  /**
   * Get latest import history
   */
  getImportHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/results/import/history?${query}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Get paginated list of candidates for a job
   */
  getCandidates: async (jobId, params = {}) => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(`${key}[]`, v));
      } else if (value !== null && value !== undefined) {
        searchParams.append(key, value);
      }
    });

    const query = searchParams.toString();
    const response = await fetch(`${API_BASE}/results/${jobId}/candidates?${query}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Verify and approve results
   */
  verifyResults: async (jobId) => {
    const response = await fetch(`${API_BASE}/results/${jobId}/verify`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Publish results officially
   */
  publishResults: async (data) => {
    const response = await fetch(`${API_BASE}/results/publish`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Save manual mark entry (Add or Update)
   */
  saveMarks: async (data) => {
    const response = await fetch(`${API_BASE}/results/marks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Fetch all mark edits awaiting approval
   */
  getPendingMarkEdits: async () => {
    const response = await fetch(`${API_BASE}/results/marks/edits/pending`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Approve or Reject a mark edit
   */
  resolveMarkEdit: async (jobId, editId, data) => {
    const response = await fetch(`${API_BASE}/results/${jobId}/marks-edits/${editId}/approve`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  /**
   * Fetch aggregate statistics for the results dashboard
   */
  getStats: async () => {
    const response = await fetch(`${API_BASE}/results/marks/stats`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  /**
   * Finalize batch for review
   */
  confirmFinalize: async (jobId) => {
    const response = await fetch(`${API_BASE}/results/${jobId}/finalize`, {
      method: 'POST',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default ResultsApi;
