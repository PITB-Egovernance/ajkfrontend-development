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
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/department-users`, {
      method: 'GET',
      headers: getHeaders(false),
    });
    const result = await safeJson(response);
    if (!response.ok) throw new Error(result?.message || 'Failed to load department users');
    return {
      data: extractList(result),
      total: result?.data?.total ?? result?.total ?? extractList(result).length,
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
      headers: {
        Authorization: `Bearer ${AuthService.getToken()}`,
        Accept: 'application/json',
        'X-API-KEY': Config.apiKey,
      },
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
    const response = await fetch(`${API_BASE}/department-users/${hashId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${AuthService.getToken()}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-KEY': Config.apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.success === false) {
      throw result;
    }

    return result;
  }


  static async delete(id) {
    const response = await fetch(`${API_BASE}/department-users/${id}`, {
      method: 'DELETE',
      headers: getHeaders(false),
    });
    const result = await safeJson(response);
    if (!response.ok) throw new Error(result?.message || 'Failed to delete department user');
    return result;
  }
}

export default DepartmentUserService;
