import apiClient from './client';

/**
 * Get fleet-wide readiness assessments with filtering and pagination.
 * @param {Object} params - { state, risk_level, search, skip, limit }
 * @returns {Promise<Object>}
 */
export async function getFleetReadiness(params = {}) {
  const query = new URLSearchParams();
  if (params.state) query.append('state', params.state);
  if (params.risk_level) query.append('risk_level', params.risk_level);
  if (params.search) query.append('search', params.search);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const qs = query.toString();
  return await apiClient(`/api/v1/readiness${qs ? `?${qs}` : ''}`);
}

/**
 * Get readiness assessment for a specific asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getAssetReadiness(assetId) {
  return await apiClient(`/api/v1/readiness/${assetId}`);
}

/**
 * Execute on-demand mission readiness re-assessment.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function assessAssetReadiness(assetId) {
  return await apiClient(`/api/v1/readiness/${assetId}/assess`, {
    method: 'POST',
  });
}

/**
 * Get readiness assessment history for an asset.
 * @param {number} assetId
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function getAssetReadinessHistory(assetId, params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  const qs = query.toString();
  return await apiClient(`/api/v1/readiness/${assetId}/history${qs ? `?${qs}` : ''}`);
}

/**
 * Get priority operational attention queue.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function getAttentionQueue(limit = 10) {
  return await apiClient(`/api/v1/readiness/attention/queue?limit=${limit}`);
}

/**
 * Get fleet-wide readiness statistics.
 * @returns {Promise<Object>}
 */
export async function getFleetReadinessStatistics() {
  return await apiClient('/api/v1/readiness/statistics/fleet');
}

/**
 * List operational recommendations.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function getRecommendations(params = {}) {
  const query = new URLSearchParams();
  if (params.asset_id) query.append('asset_id', params.asset_id);
  if (params.status) query.append('status', params.status);
  if (params.priority) query.append('priority', params.priority);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  const qs = query.toString();
  return await apiClient(`/api/v1/recommendations${qs ? `?${qs}` : ''}`);
}

/**
 * Update recommendation lifecycle status (e.g. ACKNOWLEDGED, RESOLVED).
 * @param {number} recommendationId
 * @param {string} newStatus
 * @returns {Promise<Object>}
 */
export async function updateRecommendationStatus(recommendationId, newStatus) {
  return await apiClient(`/api/v1/recommendations/${recommendationId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus }),
  });
}
