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

/**
 * Centralized HTTP client using standard fetch with timeout and error wrapping.
 * @param {string} endpoint - Relative API endpoint
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>}
 */
export async function apiClient(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const isGet = !options.method || options.method.toUpperCase() === 'GET';

  // Return existing in-flight request if an identical GET is already resolving
  if (isGet && inFlightRequests.has(url)) {
    return inFlightRequests.get(url);
  }

  const executeRequest = async () => {
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

    return data;
    } catch (error) {
      clearTimeout(id);
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
