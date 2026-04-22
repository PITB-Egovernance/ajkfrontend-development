import { useState, useEffect, useCallback, useRef } from 'react';
import Config from 'Config/Baseurl';
import AuthService from 'Services/AuthService';
import toast from 'react-hot-toast';

// Simple global cache for fetched data
const FETCH_CACHE = new Map();
const CACHE_TTL = 300000; // 5 minutes in milliseconds

/**
 * Custom hook for fetching data with automatic state management and caching
 * 
 * @param {string} endpoint - API endpoint to fetch from
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Whether to fetch immediately on mount (default: true)
 * @param {boolean} options.showErrorToast - Show error toast on failure (default: true)
 * @param {Object} options.params - URL query parameters
 * @param {boolean} options.useCache - Whether to use the global cache (default: true)
 * @param {Function} options.onSuccess - Callback on successful fetch
 * @param {Function} options.onError - Callback on error
 * @returns {Object} - Fetch state and methods
 */
const useFetch = (endpoint, options = {}) => {
  const {
    immediate = true,
    showErrorToast = true,
    params = {},
    useCache = true,
    onSuccess,
    onError
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
  const fetchData = useCallback(async (customParams = {}, forceRefresh = false) => {
    const finalParams = { ...params, ...customParams };
    const url = buildUrl(endpoint, finalParams);
    
    // Check cache first
    if (useCache && !forceRefresh && FETCH_CACHE.has(url)) {
      const cached = FETCH_CACHE.get(url);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setLastFetchTime(new Date(cached.timestamp));
        setLoading(false);
        if (onSuccess) onSuccess(cached.data);
        return { success: true, data: cached.data, fromCache: true };
      }
    }

    setLoading(true);
    setError(null);

    try {
      const token = AuthService.getToken();

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
        const now = Date.now();
        setLastFetchTime(new Date(now));
        
        // Update cache
        if (useCache) {
          FETCH_CACHE.set(url, { data: result, timestamp: now });
        }
        
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
  }, [endpoint, params, API_KEY, buildUrl, showErrorToast, onSuccess, onError, useCache]);

  // Refetch function - bypasses cache
  const refetch = useCallback((customParams = {}) => {
    return fetchData(customParams, true);
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
    isMounted.current = true;
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
export const clearFetchCache = () => FETCH_CACHE.clear();
export const removeFromCache = (url) => FETCH_CACHE.delete(url);
