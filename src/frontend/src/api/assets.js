import apiClient from './client';

/**
 * Fetch list of assets with optional search and status filters.
 * @param {Object} params
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=100]
 * @param {string} [params.search]
 * @param {string} [params.status]
 * @returns {Promise<{ total: number, skip: number, limit: number, items: Array<{
 *   asset_id: string,
 *   asset_name: string,
 *   asset_type: string,
 *   status: string,
 *   critical_component_count: number,
 *   high_priority_component_count: number,
 *   anomalous_component_count: number,
 *   calculated_at: string
 * }> }>}
 */
export async function getAssets(params = {}, options = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);

  const qs = query.toString();
  const data = await apiClient(`/api/v1/assets${qs ? `?${qs}` : ''}`, options);
  const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  return {
    total: data?.total ?? items.length,
    count: data?.count ?? items.length,
    items,
  };
}

/**
 * Fetch asset details and its real-time component summary by asset_id (e.g. 'A001').
 * @param {string} assetId
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
export async function getAssetById(assetId, options = {}) {
  const data = await apiClient(`/api/v1/assets/${encodeURIComponent(assetId)}`, options);
  if (!data) return null;
  return {
    ...data,
    components: Array.isArray(data.components) ? data.components : [],
  };
}

/**
 * Fetch all components belonging to an asset.
 * @param {string} assetId
 * @param {Object} [options]
 * @returns {Promise<Array>}
 */
export async function getAssetComponents(assetId, options = {}) {
  const data = await apiClient(`/api/v1/assets/${encodeURIComponent(assetId)}/components`, options);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.components)) return data.components;
  return [];
}

/**
 * Fetch latest predictions for all components of an asset.
 * @param {string} assetId
 * @param {Object} [options]
 * @returns {Promise<Array>}
 */
export async function getAssetPredictions(assetId, options = {}) {
  const data = await apiClient(`/api/v1/assets/${encodeURIComponent(assetId)}/predictions`, options);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.predictions)) return data.predictions;
  return [];
}
