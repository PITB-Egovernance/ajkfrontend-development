import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;

const getHeaders = (includeContentType = true) => {
  const token = AuthService.getToken();
  const headers = {
    Accept: 'application/json',
    'X-API-KEY': Config.apiKey,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
};

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || 'Request failed');
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }
  return result;
};

const RequisitionApprovalApi = {
  getGrades: () =>
    fetch(`${API_BASE}/settings/grades?per_page=200`, {
      method: 'GET',
      headers: getHeaders(false),
    }).then(handleResponse),

  // API 10 — employee personal work queue (tab: assigned | pending | returned | completed)
  myQueue: (tab = 'assigned') =>
    fetch(`${API_BASE}/requisition-approvals/my-queue?tab=${encodeURIComponent(tab)}`, {
      method: 'GET',
      headers: getHeaders(false),
    }).then(handleResponse),

  // API 11 — full detail (requisition, workflow_steps, timeline, workflow_info, can_approve, can_reject)
  getDetail: (hashId) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}`, {
      method: 'GET',
      headers: getHeaders(false),
    }).then(handleResponse),

  // API 12 — ordered audit trail of workflow steps
  getTimeline: (hashId) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/timeline`, {
      method: 'GET',
      headers: getHeaders(false),
    }).then(handleResponse),

  // API 13 — approve at current step (remarks optional)
  approve: (hashId, remarks = '') =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/approve`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ remarks }),
    }).then(handleResponse),

  // API 14 — reject at current step (remarks required, min 10 chars)
  reject: (hashId, remarks) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/reject`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ remarks }),
    }).then(handleResponse),

  // API 16 — full activity log (all history with descriptions)
  getActivityLog: (hashId) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/activity-log`, {
      method: 'GET',
      headers: getHeaders(false),
    }).then(handleResponse),

  // API 17 — list comments (oldest first)
  getComments: (hashId) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/comments`, {
      method: 'GET',
      headers: getHeaders(false),
    }).then(handleResponse),

  // API 18 — add comment (min 2, max 5000 chars)
  addComment: (hashId, comment) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/comments`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify({ comment }),
    }).then(handleResponse),

  // API 19 — delete own comment
  deleteComment: (hashId, commentHashId) =>
    fetch(`${API_BASE}/requisition-approvals/${hashId}/comments/${commentHashId}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    }).then(handleResponse),
};

export default RequisitionApprovalApi;
