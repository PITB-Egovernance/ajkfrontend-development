import Config from 'config/baseUrl';

// Candidate-portal backend, admin-scoped prefix — attempt tracking. An
// "attempt" is only consumed when a candidate is selected for interview
// (not on mere submission), counted across every advertisement that
// re-posts the same logical post (same title + department + BPS grade —
// see AttemptService::matchingJobPostIds() in the candidate-portal
// backend), capped at AttemptService::MAX_ATTEMPTS_PER_POST (3).
const CANDIDATE_ADMIN_API_BASE = Config.candidateAdminApiUrl;
const CANDIDATE_API_KEY        = Config.candidateApiKey;

const getCandidateAdminHeaders = (json = true) => {
  const h = {
    Accept:      'application/json',
    'X-API-KEY': CANDIDATE_API_KEY,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error  = new Error(result.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }
  return result;
};

const AttemptApi = {
  // GET /api/admin/applications/{hash}/attempt-history
  // hash is the candidate-portal application's hash_id (ApplicationDetail's
  // `application.id`, NOT the admin-side application_number). Returns
  // { logical_post, max_attempts, attempts_used, history: [...] }.
  getHistory: async (hashId) => {
    const res = await fetch(
      `${CANDIDATE_ADMIN_API_BASE}/applications/${encodeURIComponent(hashId)}/attempt-history`,
      { headers: getCandidateAdminHeaders(false) }
    );
    return handleResponse(res);
  },

  // PUT /api/admin/applications/{hash}/interview-shortlist
  // Recalculates attempt_number for every application to the same logical
  // post server-side — always refetch getHistory() after this succeeds.
  correctShortlistStatus: async (hashId, { shortlisted, reason }) => {
    const res = await fetch(
      `${CANDIDATE_ADMIN_API_BASE}/applications/${encodeURIComponent(hashId)}/interview-shortlist`,
      {
        method:  'PUT',
        headers: getCandidateAdminHeaders(),
        body:    JSON.stringify({ shortlisted, reason: reason || undefined }),
      }
    );
    return handleResponse(res);
  },
};

export default AttemptApi;
