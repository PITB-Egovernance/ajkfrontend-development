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
    // Surface the real reason — 404 on /roll-numbers/shortlisted usually means
    // the backend's route cache is stale (php artisan route:clear needs to run).
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

const RollNumberApi = {
  // List shortlisted applications eligible for slip generation
  getShortlisted: async (params = {}) => {
    const search    = new URLSearchParams();
    if (params.per_page)         search.set('per_page',         String(params.per_page));
    if (params.page)             search.set('page',             String(params.page));
    if (params.search)           search.set('search',           params.search);
    if (params.advertisement_no) search.set('advertisement_no', params.advertisement_no);
    if (params.status)           search.set('status',           params.status);

    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/shortlisted?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // Generate roll-number slips for selected applications
  generateSlips: async (body) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/generate-slips`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify(body),
    });
    return handleResponse(res);
  },

  // Download a single slip — returns the raw Response so the caller can stream the PDF blob
  downloadSlip: async (applicationNumber) => {
    return fetch(`${ADMIN_API_BASE}/roll-numbers/slip/${applicationNumber}`, {
      headers: getAdminHeaders(false),
    });
  },

  // JSON slip data for the in-app viewer (fast — skips PDF rendering)
  getSlipViewData: async (applicationNumber) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/slip/${applicationNumber}/view-data`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // Update an existing slip's editable fields
  updateSlip: async (applicationNumber, body) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/slip/${applicationNumber}`, {
      method:  'PUT',
      headers: getAdminHeaders(),
      body:    JSON.stringify(body),
    });
    return handleResponse(res);
  },

  // Delete one slip
  deleteSlip: async (applicationNumber) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/slip/${applicationNumber}`, {
      method:  'DELETE',
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // Bulk delete slips
  bulkDeleteSlips: async (applicationNumbers) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/bulk-delete-slips`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify({ application_numbers: applicationNumbers }),
    });
    return handleResponse(res);
  },

  // Exam centers + halls for the slip-generation allocation modal.
  // Requires the live ExamCenter/ExamHall models to expose the numeric `id`
  // (i.e. `'id'` removed from $hidden) so the FormRequest's
  // `exists:exam_centers,id` rule can resolve.
  getExamCenters: async (perPage = 500) => {
    const res = await fetch(`${ADMIN_API_BASE}/settings/exam-centers?per_page=${perPage}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  getHallsByCenter: async (centerId) => {
    const res = await fetch(`${ADMIN_API_BASE}/settings/exam-halls/by-center/${centerId}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  getAdvertisements: async (params = {}) => {
    const search = new URLSearchParams();
    if (params.per_page) search.set('per_page', String(params.per_page));
    if (params.page) search.set('page', String(params.page));
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  getApplicationsByAdvertisement: async (advertisementId, params = {}) => {
    const search = new URLSearchParams();
    if (params.per_page) search.set('per_page', String(params.per_page));
    if (params.page) search.set('page', String(params.page));
    if (params.search) search.set('search', params.search);
    if (params.eligibility_status) search.set('eligibility_status', params.eligibility_status);
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/${advertisementId}/applications?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  allocateCenters: async (advertisementId, body) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/${advertisementId}/allocate`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  getCenterUtilization: async () => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/center-utilization`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  getAdvertisementsWithJobs: async (perPage = 100) => {
    const res = await fetch(`${ADMIN_API_BASE}/advertisements?per_page=${perPage}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },
};

export default RollNumberApi;
