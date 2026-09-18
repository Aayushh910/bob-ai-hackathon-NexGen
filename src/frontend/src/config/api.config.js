/**
 * SentinelAI — Centralized API Configuration
 * Supports both Local Development and Cloud Deployed environments.
 *
 * Frontend (Vercel): https://sentinel-ai-ibm-bob.vercel.app/
 * Backend  (Render): https://bob-ai-hackathon-nexgen.onrender.com
 */

const LOCAL_BACKEND = 'http://localhost:8000';
const DEPLOYED_BACKEND = 'https://bob-ai-hackathon-nexgen.onrender.com';

function getBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // If running locally in development mode, default to localhost:8000
  if (import.meta.env.DEV) {
    return LOCAL_BACKEND;
  }
  // When deployed to production (e.g. Vercel), route to Render cloud backend
  return DEPLOYED_BACKEND;
}

export const API_CONFIG = {
  BASE_URL: getBaseUrl().replace(/\/+$/, ''),
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



