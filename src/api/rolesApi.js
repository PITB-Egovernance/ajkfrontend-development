import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;

const getHeaders = (json = true) => ({
  Accept: 'application/json',
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  ...(AuthService.getToken() && { Authorization: `Bearer ${AuthService.getToken()}` }),
  'X-API-KEY': Config.apiKey,
});

const handle = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok && !result.success) {
    const error = new Error(result.message || 'Request failed');
    error.status = response.status;
    error.errors = result.errors || {};
    throw error;
  }
  return result;
};

const RolesApi = {
  // GET /settings/roles?search=&status=&per_page=
  getAll: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/settings/roles${query ? `?${query}` : ''}`, { headers: getHeaders(false) });
    return handle(res);
  },

  // GET /settings/roles/{hash}
  getById: async (hashId) => {
    const res = await fetch(`${API_BASE}/settings/roles/${hashId}`, { headers: getHeaders(false) });
    return handle(res);
  },

  // POST /settings/roles/store
  create: async (data) => {
    const res = await fetch(`${API_BASE}/settings/roles/store`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handle(res);
  },

  // PUT /settings/roles/update/{hash}
  update: async (hashId, data) => {
    const res = await fetch(`${API_BASE}/settings/roles/update/${hashId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handle(res);
  },

  // PATCH /settings/roles/{hash}  { role_name, status }
  // The endpoint runs full update validation (role_name is required); sending
  // role_name + status toggles the status while the backend preserves permissions.
  updateStatus: async (hashId, status, roleName) => {
    const res = await fetch(`${API_BASE}/settings/roles/${hashId}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ role_name: roleName, status }),
    });
    return handle(res);
  },

  // DELETE /settings/roles/{hash}/delete
  remove: async (hashId) => {
    const res = await fetch(`${API_BASE}/settings/roles/${hashId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    return handle(res);
  },

  // GET /settings/permissions/modules
  getModules: async () => {
    const res = await fetch(`${API_BASE}/settings/permissions/modules`, { headers: getHeaders(false) });
    return handle(res);
  },

  // POST /settings/employees/{employeeHash}/assign-role  { role_id: roleHash }
  assignRole: async (employeeHash, roleHash) => {
    const res = await fetch(`${API_BASE}/settings/employees/${employeeHash}/assign-role`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ role_id: roleHash }),
    });
    return handle(res);
  },
};

export default RolesApi;
