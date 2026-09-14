import apiClient from './client';

/**
 * Get latest prediction for an asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getLatestPrediction(assetId) {
  return await apiClient(`/api/v1/predictions/${assetId}/latest`);
}

/**
 * Execute on-demand inference (Models A, B, C) on latest telemetry.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function runPrediction(assetId) {
  return await apiClient(`/api/v1/predictions/${assetId}/run`, {
    method: 'POST',
  });
}

/**
 * Get anomalies for a specific asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getAssetAnomalies(assetId) {
  return await apiClient(`/api/v1/anomalies/${assetId}`);
}

/**
 * Execute on-demand anomaly detection and sensor attribution.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function runAnomalyDetection(assetId) {
  return await apiClient(`/api/v1/anomalies/${assetId}/run`, {
    method: 'POST',
  });
}

/**
 * Get ML model registry status.
 * @returns {Promise<Object>}
 */
export async function getMlStatus() {
  return await apiClient('/api/v1/ml/status');
}

/**
 * Get RUL estimate for an asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getAssetRul(assetId) {
  return await apiClient(`/api/v1/ml/rul/${assetId}`);
}

/**
 * Query fleet-wide anomalies.
 * @param {Object} params
 * @returns {Promise<Object>}
 */
export async function getFleetAnomalies(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.severity) query.append('severity', params.severity);

  const qs = query.toString();
  return await apiClient(`/api/v1/anomalies${qs ? `?${qs}` : ''}`);
}
