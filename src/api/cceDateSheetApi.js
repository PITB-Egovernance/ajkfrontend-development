import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const ADMIN_API_BASE = Config.apiUrl;
const ADMIN_API_KEY  = Config.apiKey;

// Candidate-portal backend, admin-scoped prefix — hosts the candidate's
// self-submitted CCE subject selection, looked up by roll number.
const CANDIDATE_ADMIN_API_BASE = Config.candidateAdminApiUrl;
const CANDIDATE_API_KEY        = Config.candidateApiKey;

const getAdminHeaders = (json = true) => {
  const h = {
    Accept:          'application/json',
    'X-API-KEY':     ADMIN_API_KEY,
    Authorization:   `Bearer ${AuthService.getToken()}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

const getCandidateAdminHeaders = () => ({
  Accept:      'application/json',
  'X-API-KEY': CANDIDATE_API_KEY,
});

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    let message = result.message || `Request failed (${response.status})`;
    if (response.status === 404) {
      message = `${result.message ? result.message + ' — ' : ''}Endpoint not found. The backend route may be missing or its route cache may be stale. Ask the backend team to run \`php artisan optimize:clear\`.`;
    }
    const error  = new Error(message);
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }
  return result;
};

const CceDateSheetApi = {
  // ── Master Date Sheet ───────────────────────────────────────────────────
  getMasterDateSheet: async (advertisementId) => {
    const search = new URLSearchParams();
    if (advertisementId) search.set('advertisement_id', advertisementId);
    const res = await fetch(`${ADMIN_API_BASE}/cce/master-date-sheet?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  saveMasterDateSheet: async (advertisementId, rows) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/master-date-sheet/save`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ advertisement_id: advertisementId, rows }),
    });
    return handleResponse(res);
  },

  // ── Candidate Date Sheet ─────────────────────────────────────────────────
  // Admin-backend candidate listing — unlike getEligibleCandidatesFromPortal
  // (which hits the candidate portal directly), this one enriches each row
  // with the locally-linked application_number, needed anywhere we have to
  // call another admin-backend endpoint (e.g. roll-slip generation) that
  // identifies the candidate by application number rather than roll number.
  getEligibleCandidates: async (advertisementId, params = {}) => {
    const search = new URLSearchParams();
    if (advertisementId)  search.set('advertisement_id', advertisementId);
    if (params.search)    search.set('search',      params.search);
    if (params.rollNumber) search.set('roll_number', params.rollNumber);
    if (params.per_page)  search.set('per_page',     String(params.per_page));
    if (params.page)      search.set('page',         String(params.page));

    const res = await fetch(`${ADMIN_API_BASE}/cce/candidate-date-sheet/candidates?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // Candidate's own group-wise optional-subject selection (submitted via the
  // candidate portal), looked up by roll number rather than application number.
  getSubjectSelection: async (rollNumber) => {
    const res = await fetch(
      `${CANDIDATE_ADMIN_API_BASE}/cce/subject-selection/${encodeURIComponent(rollNumber)}`,
      { headers: getCandidateAdminHeaders() }
    );
    return handleResponse(res);
  },

  // Candidate portal's own subject-selection endpoint, called directly
  // (bypasses the admin backend entirely — no application_number, screening
  // status, or date-sheet progress attached, since the candidate portal
  // doesn't have that admin-side data). roll_number narrows to one record;
  // omitting it returns every submitted selection, paginated.
  getEligibleCandidatesFromPortal: async ({ rollNumber, advertisementId, perPage, page } = {}) => {
    const search = new URLSearchParams();
    if (rollNumber)      search.set('roll_number', rollNumber);
    if (advertisementId) search.set('advertisement_id', advertisementId);
    if (perPage)          search.set('per_page', String(perPage));
    if (page)             search.set('page', String(page));

    const res = await fetch(`${CANDIDATE_ADMIN_API_BASE}/cce/subject-selection?${search}`, {
      headers: getCandidateAdminHeaders(),
    });
    return handleResponse(res);
  },

  getCandidateSubjects: async (applicationNumber, advertisementId) => {
    const search = new URLSearchParams();
    if (advertisementId) search.set('advertisement_id', advertisementId);
    const res = await fetch(
      `${ADMIN_API_BASE}/cce/candidate-date-sheet/candidates/${encodeURIComponent(applicationNumber)}/subjects?${search}`,
      { headers: getAdminHeaders(false) }
    );
    return handleResponse(res);
  },

  saveCandidateDateSheet: async (applicationNumber, advertisementId, rows) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/candidate-date-sheet/save`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ application_number: applicationNumber, advertisement_id: advertisementId, rows }),
    });
    return handleResponse(res);
  },

  publish: async (ids) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/candidate-date-sheet/publish`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ ids }),
    });
    return handleResponse(res);
  },

  unpublish: async (ids) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/candidate-date-sheet/unpublish`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ ids }),
    });
    return handleResponse(res);
  },
};

export default CceDateSheetApi;
