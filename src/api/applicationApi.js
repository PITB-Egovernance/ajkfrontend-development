import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { buildQueryString } from 'utils/apiUtils';

const CANDIDATE_API_BASE = Config.candidateApiUrl;
const CANDIDATE_API_KEY  = Config.candidateApiKey;
const ADMIN_API_BASE     = Config.apiUrl;
// Application STATUS endpoints (single + bulk update + statuses overlay) are
// served from the local backend until the upsertStatus controller ships to
// the live admin server. Everything else still goes to ADMIN_API_BASE.
const STATUS_API_BASE    = Config.rollNumberApiUrl;
const ADMIN_API_KEY      = Config.apiKey;

const getCandidateHeaders = () => ({
  'Accept': 'application/json',
  'X-API-KEY': CANDIDATE_API_KEY,
});

const getAdminHeaders = () => ({
  'Accept': 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': ADMIN_API_KEY,
  'Authorization': `Bearer ${AuthService.getToken()}`,
});

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || result.error || 'Request failed');
    error.status  = response.status;
    error.errors  = result.errors || {};
    throw error;
  }
  return result;
};

// The candidate portal application list always reports status='submitted' (its own column).
// The real admin status (Shortlisted / Rejected / Interview) is overlaid from the admin DB.
const fetchAdminStatuses = async (numbers) => {
  try {
    const res  = await fetch(
      `${STATUS_API_BASE}/applications/statuses?numbers=${numbers.join(',')}`,
      { headers: getAdminHeaders() }
    );
    const json = await res.json();
    return json.success ? (json.data ?? {}) : {};
  } catch {
    return {};
  }
};

const overlayAdminStatuses = async (result) => {
  const items   = result?.data?.data ?? [];
  const numbers = items.map((a) => a.application_number).filter(Boolean);
  if (!numbers.length) return result;

  const map = await fetchAdminStatuses(numbers);
  if (result.data?.data) {
    result.data.data = result.data.data.map((app) => ({
      ...app,
      _admin_status: map[app.application_number] ?? null,
    }));
  }
  return result;
};

// Minimal candidate metadata shipped with every status write so the admin can
// upsert a row even when the application has never been pushed to admin DB.
const buildApplicationMeta = (app) => ({
  application_number: app.application_number || app.id,
  candidate_name:     app.applicant_name || app.candidate_name || app.snapshot_data?.name || null,
  candidate_cnic:     app.cnic || app.candidate_cnic || app.snapshot_data?.cnic || null,
  candidate_email:    app.candidate_email || app.snapshot_data?.email || null,
  candidate_mobile:   app.candidate_mobile || app.snapshot_data?.mobile_number || null,
  advertisement_no:   app.advertisement_no || app.job_post?.adv_number || app.job_post?.ext_adv_id || null,
});

const ApplicationApi = {
  getAll: async (params = {}) => {
    const filteredParams = Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    const url = `${CANDIDATE_API_BASE}/applications${buildQueryString(filteredParams)}`;
    const response = await fetch(url, { method: 'GET', headers: getCandidateHeaders() });
    const result = await handleResponse(response);
    return overlayAdminStatuses(result);
  },

  getById: async (id) => {
    // Application numbers (e.g. AJK-2026-00001) come from the admin backend
    // (roll numbers page, shortlisted list). The candidate portal has the rich
    // data (documents, education, experience…) keyed by hash_id, so first look
    // up the hash_id from the candidate portal using the application_number,
    // then fetch full detail by hash_id. Falls back to admin API if the
    // application isn't present in the candidate portal.
    const isAppNumber = /^[A-Z]+-\d{4}-\d+$/.test(String(id));
    let lookupId = id;

    if (isAppNumber) {
      try {
        const listResp = await fetch(
          `${CANDIDATE_API_BASE}/applications?search=${encodeURIComponent(id)}&per_page=5`,
          { method: 'GET', headers: getCandidateHeaders() }
        );
        if (listResp.ok) {
          const listResult = await listResp.json();
          const items      = listResult?.data?.data ?? listResult?.data ?? [];
          const match      = items.find((a) => a.application_number === id) || items[0];
          const candidateHashId = match?.hash_id || match?.id;
          if (candidateHashId && !/^[A-Z]+-\d{4}-\d+$/.test(String(candidateHashId))) {
            lookupId = candidateHashId; // got a real candidate-portal hash
          }
        }
      } catch { /* silent — fall through to admin API */ }

      // If we couldn't resolve a hash_id, hit the admin API as last resort.
      if (lookupId === id) {
        const response = await fetch(`${ADMIN_API_BASE}/applications/${id}`, {
          method: 'GET',
          headers: getAdminHeaders(),
        });
        const result   = await handleResponse(response);
        const appData  = result?.data?.application ?? result?.data ?? result;
        if (appData) appData._admin_status = appData.status ?? null;
        return result;
      }
    }

    // Fetch full data from candidate portal by hash_id.
    const response = await fetch(`${CANDIDATE_API_BASE}/applications/${lookupId}`, {
      method: 'GET',
      headers: getCandidateHeaders(),
    });
    const result = await handleResponse(response);

    const appData = result?.data?.application ?? result?.data ?? result;
    const appNum  = appData?.application_number;
    if (appNum) {
      const map = await fetchAdminStatuses([appNum]);
      appData._admin_status = map[appNum] ?? null;
    }
    return result;
  },

  // Single status update. Pass the row (or any object with candidate fields) as `meta`
  // so the backend can upsert the received_application stub if it doesn't yet exist.
  updateStatus: async (applicationNumber, status, meta = null) => {
    const body = { status };
    if (meta) body.application = buildApplicationMeta({ ...meta, application_number: applicationNumber });

    const response = await fetch(`${STATUS_API_BASE}/applications/${applicationNumber}/status`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  // Bulk status update. Pass `applications` (array of row objects) so the backend
  // can upsert any stubs that don't yet exist in the admin DB.
  bulkUpdateStatus: async (applicationNumbers, status, applications = []) => {
    const body = {
      ids: applicationNumbers,
      status,
      applications: applications.map(buildApplicationMeta),
    };
    const response = await fetch(`${STATUS_API_BASE}/applications/bulk-status`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },
};

export default ApplicationApi;
