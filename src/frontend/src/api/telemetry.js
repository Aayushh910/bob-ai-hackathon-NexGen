import apiClient from './client';
import { getComponentHistory } from './components';

/**
 * Fetch component sensor telemetry history.
 * @param {string} componentId
 * @param {Object} [params]
 * @returns {Promise<Array>}
 */
export async function getTelemetryByComponent(componentId, params = {}) {
  return await getComponentHistory(componentId, params);
}
