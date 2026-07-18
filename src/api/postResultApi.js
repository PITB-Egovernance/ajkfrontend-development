import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;
const API_KEY = Config.apiKey;

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

const handleBlobResponse = async (response) => {
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const error = new Error(result.message || result.error || 'Download failed');
    error.status = response.status;
    throw error;
  }
  return response.blob();
};

const qs = (params = {}) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, v);
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
};

const downloadBlob = async (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const PostResultApi = {
  // ── Passed Candidates ──
  getPassedCandidates: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/passed${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  shortlistForDocuments: async (jobId, examResultIds) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/shortlist`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ exam_result_ids: examResultIds }),
    });
    return handleResponse(res);
  },

  // ── Selected / Shortlisted for Documents ──
  getShortlisted: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/shortlisted${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  generateInterviewList: async (jobId, entryIds) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/shortlisted/interview`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds }),
    });
    return handleResponse(res);
  },
  generateInitialRejection: async (jobId, entryIds, reason, reasons = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/shortlisted/initial-rejection`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds, reason, reasons }),
    });
    return handleResponse(res);
  },
  generateFinalRejectionDirect: async (jobId, entryIds, reason) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/shortlisted/final-rejection`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds, reason }),
    });
    return handleResponse(res);
  },

  // ── Initial Rejection ──
  getInitialRejections: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/initial-rejections${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  reselect: async (jobId, entryIds) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/initial-rejections/reselect`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds }),
    });
    return handleResponse(res);
  },
  generateFinalRejectionFromInitial: async (jobId, entryIds, reason, reasons = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/initial-rejections/final-rejection`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds, reason, reasons }),
    });
    return handleResponse(res);
  },

  // ── Final Rejection ──
  getFinalRejections: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/final-rejections${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },

  // ── Exports (shortlisted | initial-rejections | final-rejections) ──
  exportList: async (jobId, tab, format, filenamePrefix) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/${tab}/export/${format}`, { headers: getHeaders(false) });
    const blob = await handleBlobResponse(res);
    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    await downloadBlob(blob, `${filenamePrefix}.${ext}`);
  },

  // ── Interview Phases ──
  getInterviewPhases: async (jobId) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/interview-phases`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  createInterviewPhase: async (jobId, data) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/interview-phases`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  updateInterviewPhase: async (phaseId, data) => {
    const res = await fetch(`${API_BASE}/post-result/interview-phases/${phaseId}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  deleteInterviewPhase: async (phaseId) => {
    const res = await fetch(`${API_BASE}/post-result/interview-phases/${phaseId}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return handleResponse(res);
  },
  assignToPhase: async (phaseId, entryIds) => {
    const res = await fetch(`${API_BASE}/post-result/interview-phases/${phaseId}/assign`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds }),
    });
    return handleResponse(res);
  },
  moveCandidate: async (letterId, interviewPhaseId) => {
    const res = await fetch(`${API_BASE}/post-result/call-letters/${letterId}/move`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ interview_phase_id: interviewPhaseId }),
    });
    return handleResponse(res);
  },
  publishPhase: async (phaseId) => {
    const res = await fetch(`${API_BASE}/post-result/interview-phases/${phaseId}/publish`, { method: 'POST', headers: getHeaders() });
    return handleResponse(res);
  },
  unpublishPhase: async (phaseId) => {
    const res = await fetch(`${API_BASE}/post-result/interview-phases/${phaseId}/unpublish`, { method: 'POST', headers: getHeaders() });
    return handleResponse(res);
  },

  // ── Interview Candidates / Call Letters ──
  getInterviewCandidates: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/interview-candidates${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  getCallLetter: async (letterId) => {
    const res = await fetch(`${API_BASE}/post-result/call-letters/${letterId}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  downloadCallLetter: async (letterId, filename) => {
    const res = await fetch(`${API_BASE}/post-result/call-letters/${letterId}/download`, { headers: getHeaders(false) });
    const blob = await handleBlobResponse(res);
    await downloadBlob(blob, filename || `InterviewCallLetter_${letterId}.pdf`);
  },
  bulkPublishCallLetters: async (letterIds) => {
    const res = await fetch(`${API_BASE}/post-result/call-letters/publish`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ call_letter_ids: letterIds }),
    });
    return handleResponse(res);
  },
  bulkUnpublishCallLetters: async (letterIds) => {
    const res = await fetch(`${API_BASE}/post-result/call-letters/unpublish`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ call_letter_ids: letterIds }),
    });
    return handleResponse(res);
  },

  // ── Award List ──
  getAwardList: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/award-list${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  markInterviewCompleted: async (jobId, entryIds) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/award-list/mark-completed`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds }),
    });
    return handleResponse(res);
  },
  selectAfterInterview: async (jobId, entryIds) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/award-list/select`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds }),
    });
    return handleResponse(res);
  },

  // ── Onboarding ──
  getOnboardingEligible: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/onboarding/eligible${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  getOnboarding: async (jobId, params = {}) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/onboarding${qs(params)}`, { headers: getHeaders(false) });
    return handleResponse(res);
  },
  startOnboarding: async (jobId, entryIds) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/onboarding/start`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds }),
    });
    return handleResponse(res);
  },
  completeOnboarding: async (jobId, entryIds, notes) => {
    const res = await fetch(`${API_BASE}/post-result/${jobId}/onboarding/complete`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify({ award_list_entry_ids: entryIds, notes }),
    });
    return handleResponse(res);
  },
};

export default PostResultApi;
