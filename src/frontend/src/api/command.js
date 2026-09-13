import apiClient from './client';

/**
 * Get full unified command intelligence snapshot.
 * @returns {Promise<Object>}
 */
export async function getCommandOverview() {
  return await apiClient('/api/v1/command/overview');
}

/**
 * Get centralized fleet command KPIs.
 * @returns {Promise<Object>}
 */
export async function getCommandKPIs() {
  return await apiClient('/api/v1/command/kpis');
}

/**
 * Get deterministic fleet risk ranking.
 * @returns {Promise<Array>}
 */
export async function getFleetRiskRanking() {
  return await apiClient('/api/v1/command/ranking');
}

/**
 * Get prioritized command attention queue.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getCommandAttentionQueue(limit = 15) {
  return await apiClient(`/api/v1/command/attention-queue?limit=${limit}`);
}

/**
 * Get fleet-wide readiness trends.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getReadinessTrends(assetId = null) {
  const qs = assetId ? `?asset_id=${assetId}` : '';
  return await apiClient(`/api/v1/command/trends${qs}`);
}

/**
 * Get chronological recent operational changes.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getRecentChanges(limit = 20) {
  return await apiClient(`/api/v1/command/changes?limit=${limit}`);
}

/**
 * Get operational impact assessment for a specific asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getOperationalImpact(assetId) {
  return await apiClient(`/api/v1/command/impact/${assetId}`);
}

/**
 * Get subsystem reliability analytics.
 * @returns {Promise<Array>}
 */
export async function getSubsystemAnalytics() {
  return await apiClient('/api/v1/command/subsystems');
}
