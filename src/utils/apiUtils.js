/**
 * API/HTTP Utilities
 * Helper functions for API requests and HTTP operations
 */

import Config from 'config/baseUrl';

const API_URL = Config.apiUrl;
const API_KEY = Config.apiKey;

/**
 * Gets common headers for API requests
 * @param {string} token - Optional authentication token
 * @param {Object} additionalHeaders - Additional headers to merge
 * @returns {Object} Headers object
 */
export const getAPIHeaders = (token = null, additionalHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-KEY': API_KEY,
    ...additionalHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Gets headers for FormData requests
 * @param {string} token - Optional authentication token
 * @param {Object} additionalHeaders - Additional headers to merge
 * @returns {Object} Headers object (without Content-Type)
 */
export const getFormDataHeaders = (token = null, additionalHeaders = {}) => {
  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': API_KEY,
    ...additionalHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Builds full API URL
 * @param {string} endpoint - API endpoint (without base URL)
 * @returns {string} Full API URL
 */
export const buildAPIUrl = (endpoint) => {
  if (!endpoint) return API_URL;
  return endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
};

/**
 * Builds query parameters for URL
 * @param {Object} params - Parameters object
 * @returns {string} Query string
 */
export const buildQueryString = (params) => {
  if (!params || typeof params !== 'object') return '';
  
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, v));
      } else {
        searchParams.set(key, value);
      }
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Handles API error responses
 * @param {Response|Error} error - Error response or Error object
 * @returns {Object} Normalized error object
 */
export const handleAPIError = (error) => {
  if (error instanceof Response) {
    return {
      status: error.status,
      statusText: error.statusText,
      message: `HTTP ${error.status}: ${error.statusText}`
    };
  }

  if (error instanceof Error) {
    return {
      status: error.status || 0,
      message: error.message,
      errors: error.errors || {}
    };
  }

  return {
    status: 0,
    message: 'Unknown error occurred',
    errors: {}
  };
};

/**
 * Converts object to FormData
 * @param {Object} obj - Object to convert
 * @returns {FormData} FormData instance
 */
export const objectToFormData = (obj) => {
  const formData = new FormData();
  
  Object.entries(obj).forEach(([key, value]) => {
    if (value instanceof File) {
      formData.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach(item => formData.append(`${key}[]`, item));
    } else if (value !== null && value !== undefined) {
      formData.append(key, value);
    }
  });

  return formData;
};

/**
 * Converts FormData to object
 * @param {FormData} formData - FormData instance
 * @returns {Object} Converted object
 */
export const formDataToObject = (formData) => {
  const obj = {};
  
  formData.forEach((value, key) => {
    // Remove [] from end of key
    const cleanKey = key.replace(/\[\]$/, '');
    
    if (obj[cleanKey]) {
      if (!Array.isArray(obj[cleanKey])) {
        obj[cleanKey] = [obj[cleanKey]];
      }
      obj[cleanKey].push(value);
    } else {
      obj[cleanKey] = value;
    }
  });

  return obj;
};

/**
 * Checks if response is successful
 * @param {Response} response - Fetch response object
 * @returns {boolean} True if status is 2xx
 */
export const isSuccessResponse = (response) => {
  return response && response.status >= 200 && response.status < 300;
};

/**
 * Formats API error message
 * @param {Object} errorObj - Error object from API
 * @returns {string} Formatted error message
 */
export const formatAPIErrorMessage = (errorObj) => {
  if (!errorObj) return 'An error occurred';
  
  // If single message property
  if (errorObj.message) return errorObj.message;
  
  // If errors object with field messages
  if (errorObj.errors && typeof errorObj.errors === 'object') {
    const messages = Object.values(errorObj.errors)
      .flat()
      .filter(msg => typeof msg === 'string')
      .join(', ');
    return messages || 'Validation error occurred';
  }

  // If array of errors
  if (Array.isArray(errorObj)) {
    return errorObj.join(', ');
  }

  return JSON.stringify(errorObj);
};

const apiUtils = {
  getAPIHeaders,
  getFormDataHeaders,
  buildAPIUrl,
  buildQueryString,
  handleAPIError,
  objectToFormData,
  formDataToObject,
  isSuccessResponse,
  formatAPIErrorMessage
};

export default apiUtils;
