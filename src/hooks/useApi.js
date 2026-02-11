import { useState, useCallback } from 'react';
import Config from 'config/baseUrl';
import AuthService from 'services/authService';
import toast from 'react-hot-toast';

/**
 * Custom hook for making API calls with loading, error, and data states
 * @param {Object} options - Configuration options
 * @param {boolean} options.showErrorToast - Show error toast on failure
 * @param {boolean} options.showSuccessToast - Show success toast on success
 * @returns {Object} - API state and methods
 */
const useApi = (options = {}) => {
  const {
    showErrorToast = true,
    showSuccessToast = false
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = Config.apiUrl;
  const API_KEY = Config.apiKey;

  // Get headers with authentication
  const getHeaders = useCallback((customHeaders = {}, includeContentType = true) => {
    const token = AuthService.getToken();
    const headers = {
      'Accept': 'application/json',
      'X-API-KEY': API_KEY,
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...customHeaders
    };

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }, [API_KEY]);

  // Generic request function
  const request = useCallback(async (endpoint, requestOptions = {}) => {
    const {
      method = 'GET',
      body = null,
      headers = {},
      successMessage = null,
      errorMessage = null,
      isFormData = false,
      fullUrl = false
    } = requestOptions;

    setLoading(true);
    setError(null);

    try {
      const url = fullUrl ? endpoint : `${API_BASE}${endpoint}`;
      
      const fetchOptions = {
        method,
        headers: getHeaders(headers, !isFormData)
      };

      if (body) {
        fetchOptions.body = isFormData ? body : JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = result.message || result.error || errorMessage || 'Request failed';
        throw new Error(errorMsg);
      }

      setData(result);

      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      return { success: true, data: result };
    } catch (err) {
      const errorMsg = err.message || errorMessage || 'An error occurred';
      setError(errorMsg);

      if (showErrorToast) {
        toast.error(errorMsg);
      }

      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [API_BASE, getHeaders, showSuccessToast, showErrorToast]);

  // GET request
  const get = useCallback((endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'GET' });
  }, [request]);

  // POST request
  const post = useCallback((endpoint, body, options = {}) => {
    return request(endpoint, { ...options, method: 'POST', body });
  }, [request]);

  // PUT request
  const put = useCallback((endpoint, body, options = {}) => {
    return request(endpoint, { ...options, method: 'PUT', body });
  }, [request]);

  // PATCH request
  const patch = useCallback((endpoint, body, options = {}) => {
    return request(endpoint, { ...options, method: 'PATCH', body });
  }, [request]);

  // DELETE request
  const del = useCallback((endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'DELETE' });
  }, [request]);

  // Upload file(s)
  const upload = useCallback((endpoint, formData, options = {}) => {
    return request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: formData,
      isFormData: true 
    });
  }, [request]);

  // Reset state
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
  }, []);

  return {
    // State
    data,
    loading,
    error,

    // Methods
    request,
    get,
    post,
    put,
    patch,
    delete: del,
    upload,
    reset,
    setData,
    setError,

    // Helpers
    API_BASE,
    getHeaders
  };
};

export default useApi;
