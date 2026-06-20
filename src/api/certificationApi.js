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

const CertificationApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE}/settings/certifications`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE}/settings/certifications/store`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (hashId, data) => {
    const response = await fetch(`${API_BASE}/settings/certifications/${hashId}/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (hashId) => {
    const response = await fetch(`${API_BASE}/settings/certifications/${hashId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default CertificationApi;
