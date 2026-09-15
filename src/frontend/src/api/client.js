import { API_CONFIG } from '../config/api.config';

/**
 * Custom API Error class for standard error propagation.
 */
export class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// In-flight GET request deduplication map to prevent identical concurrent backend calls
const inFlightRequests = new Map();

// Response Cache for GET requests (Memory + SessionStorage for persistence across tab switching)
const responseCache = new Map();
const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 60 seconds fresh TTL

function getCacheKey(url) {
  return `sentinel_cache_${url}`;
}

function getCachedResponse(url) {
  // 1. Check memory cache
  const mem = responseCache.get(url);
  if (mem && (Date.now() - mem.timestamp < mem.ttl)) {
    return mem.data;
  }
  // 2. Check sessionStorage
  try {
    const sessionItem = sessionStorage.getItem(getCacheKey(url));
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      if (Date.now() - parsed.timestamp < (parsed.ttl || DEFAULT_CACHE_TTL_MS)) {
        responseCache.set(url, parsed);
        return parsed.data;
      }
    }
  } catch (e) {
    // sessionStorage might fail in privacy modes
  }
  return null;
}

function setCachedResponse(url, data, ttl = DEFAULT_CACHE_TTL_MS) {
  const item = { data, timestamp: Date.now(), ttl };
  responseCache.set(url, item);
  try {
    sessionStorage.setItem(getCacheKey(url), JSON.stringify(item));
  } catch (e) {
    // ignore sessionStorage quota errors
  }
}

export function clearApiCache(endpointPrefix = '') {
  if (!endpointPrefix) {
    responseCache.clear();
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith('sentinel_cache_')) sessionStorage.removeItem(k);
      });
    } catch (e) {}
    return;
  }
  const fullPrefix = `${API_CONFIG.BASE_URL}${endpointPrefix}`;
  for (const k of responseCache.keys()) {
    if (k.startsWith(fullPrefix)) responseCache.delete(k);
  }
}

/**
 * Centralized HTTP client using standard fetch with timeout, caching, deduplication and retry.
 * @param {string} endpoint - Relative API endpoint
 * @param {RequestInit & { forceRefresh?: boolean, ttl?: number }} options - Fetch options
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const isGet = !options.method || options.method.toUpperCase() === 'GET';
  const forceRefresh = Boolean(options.forceRefresh);

  // Invalidate cache on mutations
  if (!isGet) {
    clearApiCache();
  }

  // Check cache for GET requests
  if (isGet && !forceRefresh) {
    const cached = getCachedResponse(url);
    if (cached !== null) {
      return cached;
    }
  }

  // Return existing in-flight request if an identical GET is already resolving
  if (isGet && inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const executeRequest = async (retriesLeft = 1) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(id);

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `HTTP ${response.status}: Request failed`;
        throw new ApiError(errorMessage, response.status, data);
      }

      if (isGet) {
        setCachedResponse(url, data, options.ttl || DEFAULT_CACHE_TTL_MS);
      }

      return data;
    } catch (error) {
      clearTimeout(id);
      if (retriesLeft > 0 && (error.name === 'AbortError' || error.status === 0 || error.status >= 500)) {
        // Retry once after brief pause
        await new Promise((resolve) => setTimeout(resolve, 800));
        return executeRequest(retriesLeft - 1);
      }

      // Check if stale cache is available as emergency fallback before failing
      if (isGet) {
        try {
          const stale = sessionStorage.getItem(getCacheKey(url));
          if (stale) {
            const parsed = JSON.parse(stale);
            if (parsed && parsed.data) {
              console.warn(`Serving stale cached fallback for ${url} after fetch failure.`);
              return parsed.data;
            }
          }
        } catch (e) {}
      }

      if (error.name === 'AbortError') {
        throw new ApiError(`Request timeout after ${API_CONFIG.TIMEOUT_MS}ms`, 408);
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(error.message || 'Network connection failed', 0, error);
    }
  };

  if (isGet) {
    const promise = executeRequest().finally(() => {
      inFlightRequests.delete(url);
    });
    inFlightRequests.set(url, promise);
    return promise;
  }

  return executeRequest();
}

export default apiClient;
