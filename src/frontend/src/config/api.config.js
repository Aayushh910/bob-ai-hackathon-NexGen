/**
 * SentinelAI — Centralized API Configuration
 * Manages environment-based URLs and standard endpoint routes.
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT_MS: 10000,
  ENDPOINTS: {
    HEALTH: '/api/v1/health',
    ROOT_HEALTH: '/health',
  }
};

export default API_CONFIG;
