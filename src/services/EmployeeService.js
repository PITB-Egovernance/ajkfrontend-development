import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;

const getHeaders = (contentType = true) => ({
  Accept: 'application/json',
  ...(contentType ? { 'Content-Type': 'application/json' } : {}),
  ...(AuthService.getToken() && { Authorization: `Bearer ${AuthService.getToken()}` }),
  'x-api-key': Config.apiKey,
});

const safeJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const extractList = (result) => {
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
};

class EmployeeService {
  // ──────────────────────────────────────────────────────
  // 1) Create a new employee
  // ──────────────────────────────────────────────────────
  static async register(data) {
    const response = await fetch(`${API_BASE}/employee/create`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      const error = new Error(result?.message || 'Failed to register employee');
      error.status = response.status;
      error.errors = result?.errors || {};
      throw error;
    }

    return result;
  }

  // ──────────────────────────────────────────────────────
  // 2) Get list of employees
  // ──────────────────────────────────────────────────────
  static async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/employee/list${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      throw new Error(result?.message || 'Failed to load employees');
    }

    return {
      data: extractList(result),
      total: result?.data?.total ?? result?.total ?? extractList(result).length,
    };
  }

  // ──────────────────────────────────────────────────────
  // 3) Get a single employee's details
  // ──────────────────────────────────────────────────────
  static async getUserDetails(id) {
    // No single-employee GET route exists — resolve the detail from the list.
    const response = await fetch(`${API_BASE}/employee/list?per_page=1000`, {
      method: 'GET',
      headers: getHeaders(false),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      throw new Error(result?.message || 'Failed to load employee details');
    }

    const list = extractList(result);
    const found = list.find((e) => (e.hash_id ?? e.id) === id || String(e.id) === String(id));

    if (!found) {
      throw new Error('Employee not found');
    }

    return found;
  }

  // ──────────────────────────────────────────────────────
  // 4) Update an employee
  // ──────────────────────────────────────────────────────
  static async updateUser(id, data) {
    const response = await fetch(`${API_BASE}/employee/update/${id}`, {
      method: 'PUT',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      const error = new Error(result?.message || 'Failed to update employee');
      error.status = response.status;
      error.errors = result?.errors || {};
      throw error;
    }

    return result?.data || result;
  }

  // ──────────────────────────────────────────────────────
  // 5) Delete an employee
  // ──────────────────────────────────────────────────────
  static async deleteEmployee(hashId) {
    const response = await fetch(`${API_BASE}/employee/${hashId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });

    const result = await safeJson(response);

    if (!response.ok) {
      throw new Error(result?.message || 'Failed to delete employee');
    }

    return result;
  }

  // ──────────────────────────────────────────────────────
  // 5) Bulk import users from an Excel/CSV file
  // ──────────────────────────────────────────────────────
  static async importUsers(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/users/import`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(AuthService.getToken() && { Authorization: `Bearer ${AuthService.getToken()}` }),
        'x-api-key': Config.apiKey,
      },
      body: formData,
    });

    const result = await safeJson(response);

    // ── HTTP-level failure ────────────────────────────────────────────────────
    if (!response.ok) {
      const error = new Error(result?.message || 'Failed to import employees');
      error.status = response.status;
      const rawErrors = result?.errors || {};
      error.errors = rawErrors;
      error.errorLines = Object.entries(rawErrors).flatMap(([field, messages]) =>
        (Array.isArray(messages) ? messages : [messages]).map((msg) => `• ${field}: ${msg}`)
      );
      throw error;
    }

    // ── Body-level hard failure: success === false with no usable data ────────
    if (result?.success === false) {
      const error = new Error(result?.message || 'Import failed');
      error.status = response.status;
      error.errors = result?.errors || {};
      error.errorLines = Object.entries(result?.errors || {}).flatMap(([field, messages]) =>
        (Array.isArray(messages) ? messages : [messages]).map((msg) => `• ${field}: ${msg}`)
      );
      throw error;
    }

    // ── Normalise the response so the UI always gets consistent fields ────────
    // API shape: { success, message, data: { total_rows, imported, failed, failures[] } }
    result._totalRows = result?.data?.total_rows ?? null;
    result._imported  = result?.data?.imported   ?? null;
    result._failed    = result?.data?.failed      ?? 0;
    result._failures  = Array.isArray(result?.data?.failures) ? result.data.failures : [];

    return result;
  }
}

export default EmployeeService;
