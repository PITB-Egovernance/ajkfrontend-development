import Config from 'config/baseUrl';
import { apiErrorMessage } from 'utils/apiErrors';
import { authHeaders } from 'utils/apiUtils';

// Interview attempt tracking. An "attempt" is only consumed when a candidate is
// selected for interview (not on mere submission), counted across every
// advertisement that re-posts the same logical post (same title + department +
// BPS grade), capped at 3. Served by the admin backend from the shared database
// (/candidate-portal/applications/...) — never the candidate portal's API.
const API_BASE = `${Config.apiUrl}/candidate-portal`;

const getHeaders = (json = true) => authHeaders(json);

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error  = new Error(apiErrorMessage(result, response.status, 'The request could not be completed.'));
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }
  return result;
};

const AttemptApi = {
  // GET /candidate-portal/applications/{hash}/attempt-history
  // hash is the candidate-portal application's hash_id (ApplicationDetail's
  // `application.id`); an application number also works. Returns
  // { logical_post, max_attempts, attempts_used, history: [...] }.
  getHistory: async (hashId) => {
    const res = await fetch(
      `${API_BASE}/applications/${encodeURIComponent(hashId)}/attempt-history`,
      { headers: getHeaders(false) }
    );
    return handleResponse(res);
  },

  // PUT /candidate-portal/applications/{hash}/interview-shortlist
  // Recalculates attempt_number for every application to the same logical
  // post server-side — always refetch getHistory() after this succeeds.
  correctShortlistStatus: async (hashId, { shortlisted, reason }) => {
    const res = await fetch(
      `${API_BASE}/applications/${encodeURIComponent(hashId)}/interview-shortlist`,
      {
        method:  'PUT',
        headers: getHeaders(),
        body:    JSON.stringify({ shortlisted, reason: reason || undefined }),
      }
    );
    return handleResponse(res);
  },
};

export default AttemptApi;
