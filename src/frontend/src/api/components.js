import apiClient from './client';

/**
 * Fetch component metadata and latest status by component_id (e.g. 'A035-ENG').
 * @param {string} componentId
 * @returns {Promise<{
 *   component_id: string,
 *   component_type: string,
 *   asset_id: string,
 *   created_at: string,
 *   latest_prediction: Object
 * }>}
 */
export async function getComponentById(componentId) {
  return await apiClient(`/api/v1/components/${encodeURIComponent(componentId)}`);
}

/**
 * Fetch chronological sensor telemetry readings for this component.
 * @param {string} componentId
 * @param {Object} [params]
 * @param {number} [params.limit=100]
 * @returns {Promise<Array<{
 *   id: number,
 *   timestamp: string,
 *   temperature: number|null,
 *   vibration: number|null,
 *   oil_pressure: number|null,
 *   fuel_pressure: number|null,
 *   rpm: number|null,
 *   hydraulic_pressure: number|null,
 *   battery_voltage: number|null,
 *   coolant_temperature: number|null,
 *   operating_hours: number|null,
 *   load_percentage: number|null,
 *   ambient_temperature: number|null,
 *   sensor_status: string
 * }>>}
 */
export async function getComponentHistory(componentId, params = {}, options = {}) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.append('limit', params.limit);
  const qs = query.toString();
  const data = await apiClient(`/api/v1/components/${encodeURIComponent(componentId)}/history${qs ? `?${qs}` : ''}`, options);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.readings)) return data.readings;
  return [];
}

/**
 * Fetch historical ML inference records (anomaly + failure + health) for this component.
 * @param {string} componentId
 * @param {Object} [params]
 * @param {number} [params.limit=50]
 * @param {Object} [options]
 * @returns {Promise<Array>}
 */
export async function getComponentPredictions(componentId, params = {}, options = {}) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.append('limit', params.limit);
  const qs = query.toString();
  const data = await apiClient(`/api/v1/components/${encodeURIComponent(componentId)}/predictions${qs ? `?${qs}` : ''}`, options);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.predictions)) return data.predictions;
  return [];
}

/**
 * Fetch detailed TreeSHAP feature attributions and primary/secondary reasons
 * for the latest prediction of this component.
 * Populates both `feature_contributions` and `explanations` for consumer flexibility.
 * @param {string} componentId
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function getComponentExplanation(componentId, options = {}) {
  const data = await apiClient(`/api/v1/components/${encodeURIComponent(componentId)}/explanation`, options);
  if (!data) return null;
  const items = Array.isArray(data?.feature_contributions)
    ? data.feature_contributions
    : (Array.isArray(data?.explanations) ? data.explanations : []);
  return {
    ...data,
    feature_contributions: items,
    explanations: items,
  };
}
