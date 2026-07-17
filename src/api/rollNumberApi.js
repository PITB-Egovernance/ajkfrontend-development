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

// Both `/roll-numbers` and `/advertisements` are real Laravel paginators —
// requesting one page with a large per_page silently drops everything past
// it once the record count grows beyond that page size (Postman against the
// same endpoint shows further pages; the single-page fetch below did not).
// This walks every page and merges `data` into one flat array so callers
// always get the complete list regardless of how many records exist.
const fetchAllPages = async (buildUrl, perPage) => {
  const firstRes = await fetch(buildUrl(1, perPage), { headers: getAdminHeaders(false) });
  const first    = await handleResponse(firstRes);
  const page1    = first?.data ?? {};
  let items      = Array.isArray(page1.data) ? page1.data : [];
  const lastPage = page1.last_page ?? 1;

  if (lastPage > 1) {
    const rest = await Promise.all(
      Array.from({ length: lastPage - 1 }, (_, i) => i + 2).map((page) =>
        fetch(buildUrl(page, perPage), { headers: getAdminHeaders(false) }).then(handleResponse)
      )
    );
    rest.forEach((r) => {
      const d = r?.data?.data;
      if (Array.isArray(d)) items = items.concat(d);
    });
  }

  return { ...first, data: { ...page1, data: items } };
};

const RollNumberApi = {
  // List shortlisted applications eligible for slip generation. Filtering,
  // sorting and pagination all happen server-side (see RollNumberController::shortlisted) —
  // pass every active filter here rather than fetching everything and filtering client-side.
  getShortlisted: async (params = {}) => {
    const search    = new URLSearchParams();
    if (params.per_page)            search.set('per_page',            String(params.per_page));
    if (params.page)                search.set('page',                String(params.page));
    if (params.search)              search.set('search',              params.search);
    if (params.advertisement_no)    search.set('advertisement_no',    params.advertisement_no);
    if (params.status)              search.set('status',              params.status);
    if (params.payment_status)      search.set('payment_status',      params.payment_status);
    if (params.exam_center_id)      search.set('exam_center_id',      params.exam_center_id);
    if (params.preferred_exam_city) search.set('preferred_exam_city', params.preferred_exam_city);
    if (params.slip_status)         search.set('slip_status',         params.slip_status);
    if (params.has_roll_number)     search.set('has_roll_number',     '1');

    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/shortlisted?${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // Queue roll-number slip generation for selected applications.
  // Returns { generation_id, status } — the actual slips are produced
  // asynchronously by a queue job; poll getGenerationStatus() for completion.
  generateSlips: async (body) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/generate-slips`, {
      method:  'POST',
      headers: getAdminHeaders(),
      body:    JSON.stringify(body),
    });
    return handleResponse(res);
  },

  // Poll the status of a queued slip-generation batch.
  getGenerationStatus: async (generationId) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/generate-slips/status/${generationId}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // Download a single slip — returns the raw Response so the caller can stream the PDF blob
  downloadSlip: async (applicationNumber) => {
    return fetch(`${ADMIN_API_BASE}/roll-numbers/slip/${applicationNumber}`, {
      headers: getAdminHeaders(false),
    });
  },

  // JSON slip data for the in-app viewer looked up by roll number (fast —
  // skips PDF rendering). A roll number can be shared by more than one of
  // the candidate's applications (e.g. multiple CCE posts), so pass
  // applicationNumber whenever the caller has it — it disambiguates which
  // specific application's slip to load instead of an arbitrary match.
  getSlipViewData: async (rollNumber, applicationNumber) => {
    const search = applicationNumber ? `?application_number=${encodeURIComponent(applicationNumber)}` : '';
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/roll-slip/${encodeURIComponent(rollNumber)}/view-data${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  // CCE Written-stage equivalents of getSlipViewData/downloadSlip — sourced
  // server-side from CceCandidateDateSheet instead of the Screening stage's
  // exam_sessions, so the two stages' slips never mix.
  getCceWrittenSlipViewData: async (rollNumber, applicationNumber) => {
    const search = applicationNumber ? `?application_number=${encodeURIComponent(applicationNumber)}` : '';
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/roll-slip/${encodeURIComponent(rollNumber)}/written-view-data${search}`, {
      headers: getAdminHeaders(false),
    });
    return handleResponse(res);
  },

  downloadCceWrittenSlip: async (rollNumber, applicationNumber) => {
    const search = applicationNumber ? `?application_number=${encodeURIComponent(applicationNumber)}` : '';
    return fetch(`${ADMIN_API_BASE}/roll-numbers/cce-written-slip/${encodeURIComponent(rollNumber)}${search}`, {
      headers: getAdminHeaders(false),
    });
  },

  // JSON slip data looked up by application number — includes raw editable
  // fields (exam_center_id, exam_date, attendance_time) used to pre-fill the
  // "Edit Slip" form, unlike the roll-number-keyed view above which is
  // display-only.
  getSlipEditData: async (applicationNumber) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/slip/${encodeURIComponent(applicationNumber)}/view-data`, {
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

  // With an explicit `page`, fetch exactly that page (unchanged behavior).
  // Without one, walk every page so the caller gets every advertisement,
  // not just whatever fits in the first `per_page`.
  getAdvertisements: async (params = {}) => {
    if (params.page) {
      const search = new URLSearchParams();
      if (params.per_page) search.set('per_page', String(params.per_page));
      search.set('page', String(params.page));
      const res = await fetch(`${ADMIN_API_BASE}/roll-numbers?${search}`, {
        headers: getAdminHeaders(false),
      });
      return handleResponse(res);
    }
    return fetchAllPages(
      (page, perPage) => `${ADMIN_API_BASE}/roll-numbers?per_page=${perPage}&page=${page}`,
      params.per_page || 200
    );
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
    return fetchAllPages(
      (page, pp) => `${ADMIN_API_BASE}/advertisements?per_page=${pp}&page=${page}`,
      perPage
    );
  },

  // Publish/unpublish roll number slips so they become visible/hidden to
  // candidates. applicationNumbers is optional — omit to affect every
  // eligible slip for the advertisement.
  publishSlips: async (advertisementId, applicationNumbers) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/${advertisementId}/publish`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(applicationNumbers?.length ? { application_numbers: applicationNumbers } : {}),
    });
    return handleResponse(res);
  },

  unpublishSlips: async (advertisementId, applicationNumbers) => {
    const res = await fetch(`${ADMIN_API_BASE}/roll-numbers/${advertisementId}/unpublish`, {
      method: 'POST',
      headers: getAdminHeaders(),
      body: JSON.stringify(applicationNumbers?.length ? { application_numbers: applicationNumbers } : {}),
    });
    return handleResponse(res);
  },
};

export default RollNumberApi;
