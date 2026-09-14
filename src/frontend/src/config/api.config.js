/**
 * SentinelAI — Centralized API Configuration
 * Manages environment-based URLs and standard endpoint routes.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const API_CONFIG = {
  BASE_URL: rawBaseUrl.replace(/\/+$/, ''),
  TIMEOUT_MS: 30000,
  ENDPOINTS: {
    HEALTH: '/api/v1/health',
    ROOT_HEALTH: '/health',
  }
};

export default API_CONFIG;
