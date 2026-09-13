import apiClient from './client';

/**
 * Fetch global telemetry readings.
 * @param {Object} params
 * @returns {Promise<{ total: number, page: number, size: number, items: Array }>}
 */
export async function getTelemetry(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.asset_id) query.append('asset_id', params.asset_id);
  if (params.start_time) query.append('start_time', params.start_time);
  if (params.end_time) query.append('end_time', params.end_time);

  const qs = query.toString();
  return await apiClient(`/api/v1/telemetry${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch telemetry history for a specific asset.
 * @param {number} assetId
 * @param {Object} params
 * @returns {Promise<{ total: number, page: number, size: number, items: Array }>}
 */
export async function getAssetTelemetry(assetId, params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.start_time) query.append('start_time', params.start_time);
  if (params.end_time) query.append('end_time', params.end_time);
  if (params.component_id) query.append('component_id', params.component_id);
  if (params.order_desc !== undefined) query.append('order_desc', params.order_desc);

  const qs = query.toString();
  return await apiClient(`/api/v1/assets/${assetId}/telemetry${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch the latest telemetry record for an asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getLatestAssetTelemetry(assetId) {
  return await apiClient(`/api/v1/assets/${assetId}/telemetry/latest`);
}
