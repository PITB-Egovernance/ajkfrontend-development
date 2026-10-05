import Config from 'config/baseUrl';
import { authHeaders } from 'utils/apiUtils';

const API_BASE = Config.apiUrl;

const getHeaders = (contentType = true) => authHeaders(contentType);

const safeJson = async (response) => {
  try { return await response.json(); } catch { return {}; }
};

const extractList = (result) => {
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
};

class DepartmentUserService {
  static async create(data) {
    console.log("Data", data)
    const response = await fetch(`${API_BASE}/department/register`, {
      method: 'POST',
      headers: getHeaders(true),
      body: JSON.stringify(data),
    });
    const result = await safeJson(response);
    if (!response.ok) {
      const error = new Error(result?.message || 'Failed to create department user');
      error.status = response.status;
      error.errors = result?.errors || {};
      throw error;
    }
    return result;
  }

  static async getAll(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    const response = await fetch(`${API_BASE}/department-users${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getHeaders(false),
    });
    const result = await safeJson(response);
    if (!response.ok) throw new Error(result?.message || 'Failed to load department users');
    return {
      data: extractList(result),
      total: result?.data?.total ?? result?.total ?? extractList(result).length,
      statusCounts: result?.data?.status_counts ?? null,
    };
  }

  // static async getById(id) {
  //   const response = await fetch(`${API_BASE}/department-user/${id}`, {
  //     method: 'GET',
  //     headers: getHeaders(false),
  //   });
  //   const result = await safeJson(response);
  //   if (!response.ok) throw new Error(result?.message || 'Failed to load department user');
  //   return result?.data || result;
  // }

  static async getById(hashId) {
    const response = await fetch(`${Config.apiUrl}/department-users/${hashId}`, {
      method: 'GET',
      headers: authHeaders(false),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw result;
    }

    return result.data;
  }

  // static async update(id, data) {
  //   const response = await fetch(`${API_BASE}/department-user/update/${id}`, {
  //     method: 'POST',
  //     headers: getHeaders(true),
  //     body: JSON.stringify(data),
  //   });
  //   const result = await safeJson(response);
  //   if (!response.ok) {
  //     const error = new Error(result?.message || 'Failed to update department user');
  //     error.status = response.status;
  //     error.errors = result?.errors || {};
  //     throw error;
  //   }
  //   return result?.data || result;
  // }

  static async update(hashId, payload) {
    const response = await fetch(`${API_BASE}/department-users/update/${hashId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw result;
    }

    return result;
  }

  /**
   * Update department user profile (name, mobile, password).
   * This hits the department-specific endpoint under /department/dept-users/update-profile/{hashId}.
   */
  static async updateProfile(hashId, payload) {
    const response = await fetch(`${API_BASE}/department/dept-users/update-profile/${hashId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw result;
    }

    return result;
  }

  static async delete(id) {
    const response = await fetch(`${API_BASE}/department-users/${id}/delete`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await safeJson(response);
    if (!response.ok) throw new Error(result?.message || 'Failed to delete department user');
    return result;
  }
}

export default DepartmentUserService;
