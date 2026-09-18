/**
 * SentinelAI — Centralized API Configuration
 * Manages environment-based URLs and verified backend endpoint routes.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:8000' : 'https://bob-ai-hackathon-nexgen.onrender.com');

export const API_CONFIG = {
  BASE_URL: rawBaseUrl.replace(/\/+$/, ''),
  TIMEOUT_MS: 30000,
  ENDPOINTS: {
    HEALTH: '/api/v1/health',
    ROOT_HEALTH: '/health',
    DASHBOARD_SUMMARY: '/api/v1/dashboard/summary',
    CRITICAL_COMPONENTS: '/api/v1/dashboard/critical-components',
    HIGH_PRIORITY_COMPONENTS: '/api/v1/dashboard/high-priority-components',
    ASSETS: '/api/v1/assets',
    COMPONENTS: '/api/v1/components',
    COPILOT_QUERY: '/api/v1/copilot/query',
    COPILOT_INTENTS: '/api/v1/copilot/intents',
  }
};

export default API_CONFIG;
