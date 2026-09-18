import apiClient from './client';
import { API_CONFIG } from '../config/api.config';

/**
 * Fetch high-level fleet dashboard summary with readiness rate,
 * status distribution (READY, ATTENTION, NOT_READY), and risk metrics.
 * @returns {Promise<{
 *   total_assets: number,
 *   total_components: number,
 *   readiness_rate_percent: number,
 *   status_distribution: { READY: number, ATTENTION: number, NOT_READY: number },
 *   component_risk_summary: { critical_components: number, high_priority_components: number, anomalous_components: number }
 * }>}
 */
export async function getDashboardSummary() {
  return await apiClient(API_CONFIG.ENDPOINTS.DASHBOARD_SUMMARY);
}

/**
 * Fetch list of components currently in CRITICAL maintenance priority.
 * Normalizes backend response { count, components: [...] } to a flat Array.
 * @param {Object} [options]
 * @returns {Promise<Array>}
 */
export async function getCriticalComponents(options = {}) {
  const data = await apiClient(API_CONFIG.ENDPOINTS.CRITICAL_COMPONENTS, options);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.components)) return data.components;
  return [];
}

/**
 * Fetch list of components currently in HIGH maintenance priority.
 * Normalizes backend response { count, components: [...] } to a flat Array.
 * @param {Object} [options]
 * @returns {Promise<Array>}
 */
export async function getHighPriorityComponents(options = {}) {
  const data = await apiClient(API_CONFIG.ENDPOINTS.HIGH_PRIORITY_COMPONENTS, options);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.components)) return data.components;
  return [];
}
