import apiClient from './client';
import { getComponentHistory } from './components';

/**
 * Fetch global sensor telemetry readings from backend database.
 * @param {Object} [params]
 * @param {number} [params.limit=100]
 * @param {number} [params.skip=0]
 * @param {number|string} [params.asset_id]
 * @returns {Promise<Array>}
 */
export async function getGlobalTelemetry(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.limit !== undefined) query.append('limit', params.limit);
    if (params.skip !== undefined) query.append('skip', params.skip);
    if (params.asset_id) query.append('asset_id', params.asset_id);
    const qs = query.toString();
    const data = await apiClient(`/api/v1/telemetry${qs ? `?${qs}` : ''}`);
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  } catch (err) {
    console.warn('Could not fetch global telemetry stream:', err);
    return [];
  }
}

/**
 * Fetch component sensor telemetry history.
 * @param {string} componentId
 * @param {Object} [params]
 * @returns {Promise<Array>}
 */
export async function getTelemetryByComponent(componentId, params = {}) {
  return await getComponentHistory(componentId, params);
}
