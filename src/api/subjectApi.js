import Config from 'config/baseUrl';
import AuthService from 'services/authService';

const API_BASE = Config.apiUrl;

const getHeaders = () => ({
  Authorization: `Bearer ${AuthService.getToken()}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-API-KEY': Config.apiKey,
});

const handleResponse = async (response) => {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || result.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return result;
};

const SubjectApi = {
  getAll: async (page = 1, perPage = 15) => {
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    const response = await fetch(`${API_BASE}/settings/subjects?${params.toString()}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE}/settings/subjects/store`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (hashId, data) => {
    const response = await fetch(`${API_BASE}/settings/subjects/${hashId}/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (hashId) => {
    const response = await fetch(`${API_BASE}/settings/subjects/${hashId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // Groups (from the Groups settings module) used to populate the subject group dropdown.
  getGroups: async () => {
    const response = await fetch(`${API_BASE}/settings/group`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default SubjectApi;
