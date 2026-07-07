import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const ADMIN_API_BASE = Config.apiUrl;
const ADMIN_API_KEY  = Config.apiKey;

const getAdminHeaders = (json = true) => {
  const h = {
    Accept:          'application/json',
    'X-API-KEY':     ADMIN_API_KEY,
    Authorization:   `Bearer ${AuthService.getToken()}`,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
};

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

const CceScreeningApi = {
  // Advertisements eligible for CCE screening — only those with at least one
  // CCE candidate whose roll number has already been generated. Use this
  // instead of RollNumberApi.getAdvertisements(), which lists every
  // advertisement regardless of exam type or roll-number generation status.
  advertisements: async () => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/screening/advertisements`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // List CCE screening results for an advertisement — auto-synced server-side
  // from already-roll-numbered candidates on every load.
  list: async (advertisementId, params = {}) => {
    const search = new URLSearchParams();
    search.set('advertisement_id', advertisementId);
    if (params.status)   search.set('status',   params.status);
    if (params.search)   search.set('search',   params.search);
    if (params.per_page) search.set('per_page', String(params.per_page));
    if (params.page)     search.set('page',     String(params.page));

    const res = await fetch(`${ADMIN_API_BASE}/cce/screening?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  bulkSetStatus: async (ids, status) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/screening/bulk-status`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ ids, status }),
    });
    return handleResponse(res);
  },

  publish: async (ids) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/screening/publish`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ ids }),
    });
    return handleResponse(res);
  },

  unpublish: async (ids) => {
    const res = await fetch(`${ADMIN_API_BASE}/cce/screening/unpublish`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ ids }),
    });
    return handleResponse(res);
  },
};

export default CceScreeningApi;
