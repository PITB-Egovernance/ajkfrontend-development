import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const parsePagination = (result, fallbackPage = 1, fallbackPerPage = 15, fallbackTotal = 0) => {
  const payload = result?.data && !Array.isArray(result.data) ? result.data : {};
  return {
    current_page: Number(payload.current_page ?? fallbackPage),
    per_page: Number(payload.per_page ?? fallbackPerPage),
    last_page: Number(payload.last_page ?? 1),
    total: Number(payload.total ?? fallbackTotal),
  };
};

const getPage = async (resource, page = 1, perPage = 15) => {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  const response = await fetch(`${API_BASE}/settings/${resource}?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const result = await response.json().catch(() => ({}));

  if (!(response.ok || result.success || result.status === 200)) {
    const error = new Error(result.message || `Failed to fetch ${resource}`);
    error.status = response.status;
    throw error;
  }

  const payload = result?.data ?? {};
  const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(result?.data) ? result.data : [];
  return {
    items: list,
    pagination: parsePagination(result, page, perPage, list.length),
    raw: result,
  };
};

const create = async (resource, body) => {
  const response = await fetch(`${API_BASE}/settings/${resource}/store`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!(response.ok || result.success || result.status === 200 || result.status === 201)) {
    const error = new Error(result.message || `Failed to create ${resource}`);
    error.status = response.status;
    throw error;
  }
  return result;
};

const update = async (resource, hashId, body) => {
  const response = await fetch(`${API_BASE}/settings/${resource}/${hashId}/update`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!(response.ok || result.success || result.status === 200)) {
    const error = new Error(result.message || `Failed to update ${resource}`);
    error.status = response.status;
    throw error;
  }
  return result;
};

const remove = async (resource, hashId) => {
  const response = await fetch(`${API_BASE}/settings/${resource}/${hashId}/delete`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const result = await response.json().catch(() => ({}));
  if (!(response.ok || result.success || result.status === 200)) {
    const error = new Error(result.message || `Failed to delete ${resource}`);
    error.status = response.status;
    throw error;
  }
  return result;
};

const settingsCatalogApi = {
  getHeaders,
  parsePagination,
  getPage,
  create,
  update,
  remove,
};

export default settingsCatalogApi;
