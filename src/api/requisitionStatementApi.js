import Config from 'config/baseUrl';
import { apiErrorMessage } from 'utils/apiErrors';
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
    const error = new Error(apiErrorMessage(result, response.status, 'The request could not be completed.'));
    error.status = response.status;
    throw error;
  }
  return result;
};

const RequisitionStatementApi = {
  getAll: async (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
    ).toString();
    const response = await fetch(`${API_BASE}/settings/requisition-statements${query ? `?${query}` : ''}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  create: async (data) => {
    const response = await fetch(`${API_BASE}/settings/requisition-statements/store`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  update: async (hashId, data) => {
    const response = await fetch(`${API_BASE}/settings/requisition-statements/${hashId}/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  delete: async (hashId) => {
    const response = await fetch(`${API_BASE}/settings/requisition-statements/${hashId}/delete`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};

export default RequisitionStatementApi;
