import { useState, useEffect, useCallback, useRef } from 'react';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import toast from 'react-hot-toast';

/**
 * Custom hook for fetching data with automatic state management
 * Ideal for GET requests that need to be called on component mount or on dependency changes
 * 
 * @param {string} endpoint - API endpoint to fetch from
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Whether to fetch immediately on mount (default: true)
 * @param {boolean} options.showErrorToast - Show error toast on failure (default: true)
 * @param {Object} options.params - URL query parameters
 * @param {Function} options.onSuccess - Callback on successful fetch
 * @param {Function} options.onError - Callback on error
 * @param {Array} options.dependencies - Dependencies that trigger refetch
 * @returns {Object} - Fetch state and methods
 */
const useFetch = (endpoint, options = {}) => {
  const {
    immediate = true,
    showErrorToast = true,
    params = {},
    onSuccess,
    onError
    // Note: dependencies can be passed for manual refetch triggers via refetch()
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  const API_BASE = Config.apiUrl;
  const API_KEY = Config.apiKey;
  const isMounted = useRef(true);

  // Build URL with query parameters
  const buildUrl = useCallback((baseEndpoint, queryParams = {}) => {
    const url = new URL(`${API_BASE}${baseEndpoint}`);
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  }, [API_BASE]);

  // Fetch function
  const fetchData = useCallback(async (customParams = {}) => {
    setLoading(true);
    setError(null);

    try {
      const token = AuthService.getToken();
      const url = buildUrl(endpoint, { ...params, ...customParams });

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-API-KEY': API_KEY,
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to fetch data');
      }

      if (isMounted.current) {
        setData(result);
        setLastFetchTime(new Date());
        
        if (onSuccess) {
          onSuccess(result);
        }
      }

      return { success: true, data: result };
    } catch (err) {
      if (isMounted.current) {
        setError(err.message);
        
        if (showErrorToast) {
          toast.error(err.message);
        }
        
        if (onError) {
          onError(err);
        }
      }

      return { success: false, error: err.message };
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [endpoint, params, API_KEY, buildUrl, showErrorToast, onSuccess, onError]);

  // Refetch function
  const refetch = useCallback((customParams = {}) => {
    return fetchData(customParams);
  }, [fetchData]);

  // Reset state
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setLastFetchTime(null);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (immediate) {
      fetchData();
    }

    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return {
    // State
    data,
    loading,
    error,
    lastFetchTime,

    // Actions
    fetch: fetchData,
    refetch,
    reset,
    setData,

    // Computed
    isLoading: loading,
    isError: !!error,
    isEmpty: !loading && !error && !data
  };
};

export default useFetch;
