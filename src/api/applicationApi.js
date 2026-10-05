import Config from 'config/baseUrl';
import { apiErrorMessage } from 'utils/apiErrors';
import { buildQueryString } from 'utils/apiUtils';
import { authHeaders } from 'utils/apiUtils';

const ADMIN_API_BASE     = Config.apiUrl;
// Candidate-portal applications, served by the admin backend from the shared
// database — the browser never calls the candidate portal's API.
const PORTAL_API_BASE    = `${ADMIN_API_BASE}/candidate-portal`;

const getAdminHeaders = () => authHeaders();

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(apiErrorMessage(result, response.status, 'The request could not be completed.'));
    error.status  = response.status;
    error.errors  = result.errors || {};
    throw error;
  }
  return result;
};

// The candidate portal application list always reports status='submitted' (its own column).
// The real admin status (Shortlisted / Rejected / Interview) is overlaid from the admin DB.
// This same batch call also returns job_designation — the candidate portal's
// own list endpoint never returns a job title (only a numeric job_post_id
// nothing on this side can resolve), so this is the only source for one.
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
    result.data.data = result.data.data.map((app) => {
      const entry = map[app.application_number];
      // entry is { status, job_designation } on the current backend contract;
      // tolerate the older plain-string shape too in case of a rollback.
      const adminStatus = entry && typeof entry === 'object' ? entry.status : entry;
      const jobDesignation = entry && typeof entry === 'object' ? entry.job_designation : null;
      return {
        ...app,
        _admin_status: adminStatus ?? null,
        _job_designation: jobDesignation ?? null,
      };
    });
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
    const url = `${PORTAL_API_BASE}/applications${buildQueryString(filteredParams)}`;
    const response = await fetch(url, { method: 'GET', headers: getAdminHeaders() });
    const result = await handleResponse(response);
    return overlayAdminStatuses(result);
  },

  getById: async (id) => {
    // Accepts the candidate-portal hash_id / uuid or an application number
    // (e.g. AJK-2026-00001, from the roll numbers page / shortlisted list).
    // Falls back to the admin's own received-application record for an
    // application the candidate portal doesn't have.
    const response = await fetch(`${PORTAL_API_BASE}/applications/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: getAdminHeaders(),
    });

    if (response.status === 404 && /^[A-Z]+-\d{4}-\d+$/.test(String(id))) {
      const fallback = await fetch(`${ADMIN_API_BASE}/applications/${id}`, {
        method: 'GET',
        headers: getAdminHeaders(),
      });
      const result  = await handleResponse(fallback);
      const appData = result?.data?.application ?? result?.data ?? result;
      if (appData) appData._admin_status = appData.status ?? null;
      return result;
    }

    const result = await handleResponse(response);

    const appData = result?.data?.application ?? result?.data ?? result;
    const appNum  = appData?.application_number;
    if (appNum) {
      const map = await fetchAdminStatuses([appNum]);
      const entry = map[appNum];
      const adminStatus = entry && typeof entry === 'object' ? entry.status : entry;
      const jobDesignation = entry && typeof entry === 'object' ? entry.job_designation : null;
      appData._admin_status = adminStatus ?? null;
      appData._job_designation = jobDesignation ?? null;
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

  const response = await fetch(`${ADMIN_API_BASE}/applications/bulk-status`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  });

  return handleResponse(response);
},
};

export default ApplicationApi;
