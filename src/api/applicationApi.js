import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import { buildQueryString } from 'utils/apiUtils';

const CANDIDATE_API_BASE = Config.candidateApiUrl;
const CANDIDATE_API_KEY  = Config.candidateApiKey;
const ADMIN_API_BASE     = Config.apiUrl;
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
      `${ADMIN_API_BASE}/applications/statuses?numbers=${numbers.join(',')}`,
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
// const buildApplicationMeta = (app) => ({
//   application_number: app.application_number || app.id,
//   candidate_name:     app.applicant_name || app.candidate_name || app.snapshot_data?.name || null,
//   candidate_cnic:     app.cnic || app.candidate_cnic || app.snapshot_data?.cnic || null,
//   candidate_email:    app.candidate_email || app.snapshot_data?.email || null,
//   candidate_mobile:   app.candidate_mobile || app.snapshot_data?.mobile_number || null,
//   advertisement_no:   app.advertisement_no || app.job_post?.adv_number || app.job_post?.ext_adv_id || null,
//   domicile_district:  app.domicile_district || null,
//   disability:         app.disability || null,
//   preferred_exam_cities: app.preferred_exam_cities || [],
//   candidate_cnic_front: app.cnic_front_url || null,
//   candidate_cnic_back:  app.cnic_back_url || null,
//   candidate_photo:      app.photo_url || null,
// });

const buildApplicationMeta = (app = {}) => ({
  application_number: app.application_number || app.id,

  candidate_name:
    app.applicant_name || app.candidate_name || app.snapshot_data?.name || null,

  candidate_cnic:
    app.cnic || app.candidate_cnic || app.snapshot_data?.cnic || null,

  candidate_email:
    app.candidate_email || app.snapshot_data?.email || null,

  candidate_mobile:
    app.candidate_mobile || app.snapshot_data?.mobile_number || null,

  advertisement_no:
    app.advertisement_no || app.job_post?.adv_number || app.job_post?.ext_adv_id || null,

  domicile_district: app.domicile_district || null,
  disability: app.disability || null,
  preferred_exam_cities: app.preferred_exam_cities || [],

  // CNIC / Photo fields from ApplicationList.jsx
  candidate_cnic_front:
    app.cnic_front_path || app.cnic_front_url || null,

  candidate_cnic_back:
    app.cnic_back_path || app.cnic_back_url || null,

  candidate_photo:
    app.profile_photo_path ||
    app.photo_path ||
    app.profile_photo_url ||
    app.photo_url ||
    null,

  // Optional: send separate fields also
  cnic_front_path: app.cnic_front_path || null,
  cnic_back_path: app.cnic_back_path || null,
  photo_path: app.photo_path || null,
  profile_photo_path: app.profile_photo_path || null,
  profile_photo_url: app.profile_photo_url || null,
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
  // Fallback: if the single endpoint returns 404 (live backend's updateStatus path
  // throws ModelNotFoundException when the admin row hasn't been synced yet, but
  // bulk-status uses an upsert path that creates the stub), retry via bulk-status.
  // updateStatus: async (applicationNumber, status, meta = null) => {
  //   const body = { status };
  //   if (meta) body.application = buildApplicationMeta({ ...meta, application_number: applicationNumber });

  //   const response = await fetch(`${ADMIN_API_BASE}/applications/${applicationNumber}/status`, {
  //     method: 'PUT',
  //     headers: getAdminHeaders(),
  //     body: JSON.stringify(body),
  //   });

  //   // Quick success — return as normal.
  //   if (response.ok) return handleResponse(response);

  //   // On 404, the live backend's updateStatus path failed because the admin DB
  //   // has no row for this application_number yet. Fall back to bulk-status, which
  //   // uses updateOrCreate and can create the stub from the supplied meta.
  //   if (response.status === 404) {
  //     const fbResponse = await fetch(`${ADMIN_API_BASE}/applications/bulk-status`, {
  //       method: 'PUT',
  //       headers: getAdminHeaders(),
  //       body: JSON.stringify({
  //         ids: [applicationNumber],
  //         status,
  //         applications: [buildApplicationMeta({ ...meta, application_number: applicationNumber })],
  //       }),
  //     });
  //     return handleResponse(fbResponse);
  //   }

  //   return handleResponse(response);
  // },

  updateStatus: async (applicationNumber, status, meta = null) => {
  const applicationMeta = buildApplicationMeta({
    ...meta,
    application_number: applicationNumber,
  });

  const body = {
    status,
    application: applicationMeta,
  };

  console.log('Update Status API Body:', body);

  const response = await fetch(`${ADMIN_API_BASE}/applications/${applicationNumber}/status`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  });

  if (response.ok) return handleResponse(response);

  if (response.status === 404) {
    const fbResponse = await fetch(`${ADMIN_API_BASE}/applications/bulk-status`, {
      method: 'PUT',
      headers: getAdminHeaders(),
      body: JSON.stringify({
        ids: [applicationNumber],
        status,
        applications: [applicationMeta],
      }),
    });

    return handleResponse(fbResponse);
  }

  return handleResponse(response);
},

  // Bulk status update. Pass `applications` (array of row objects) so the backend
  // can upsert any stubs that don't yet exist in the admin DB.
  // bulkUpdateStatus: async (applicationNumbers, status, applications = []) => {
  //   const body = {
  //     ids: applicationNumbers,
  //     status,
  //     applications: applications.map(buildApplicationMeta),
  //   };
  //   const response = await fetch(`${ADMIN_API_BASE}/applications/bulk-status`, {
  //     method: 'PUT',
  //     headers: getAdminHeaders(),
  //     body: JSON.stringify(body),
  //   });
  //   return handleResponse(response);
  // },

  bulkUpdateStatus: async (applicationNumbers, status, applications = []) => {
  const body = {
    ids: applicationNumbers,
    status,
    applications: applications.map(buildApplicationMeta),
  };

  console.log('Bulk Status API Body:', body);

  const response = await fetch(`${ADMIN_API_BASE}/applications/bulk-status`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
},
};

export default ApplicationApi;
