import apiClient from './client';

/**
 * Fetch paginated list of assets with optional search and filters.
 * @param {Object} params
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=50]
 * @param {string} [params.search]
 * @param {string} [params.status]
 * @param {string} [params.asset_type]
 * @returns {Promise<{ total: number, page: number, size: number, items: Array }>}
 */
export async function getAssets(params = {}) {
  const query = new URLSearchParams();
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);
  if (params.search) query.append('search', params.search);
  if (params.status) query.append('status', params.status);
  if (params.asset_type) query.append('asset_type', params.asset_type);

  const qs = query.toString();
  return await apiClient(`/api/v1/assets${qs ? `?${qs}` : ''}`);
}

/**
 * Fetch asset details by primary ID.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function getAssetById(id) {
  return await apiClient(`/api/v1/assets/${id}`);
}

/**
 * Create a new fleet asset.
 * @param {Object} assetData
 * @returns {Promise<Object>}
 */
export async function createAsset(assetData) {
  return await apiClient('/api/v1/assets', {
    method: 'POST',
    body: JSON.stringify(assetData),
  });
}

/**
 * Update existing asset details.
 * @param {number} id
 * @param {Object} assetData
 * @returns {Promise<Object>}
 */
export async function updateAsset(id, assetData) {
  return await apiClient(`/api/v1/assets/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(assetData),
  });
}

/**
 * Delete an asset from the fleet registry.
 * @param {number} id
 * @returns {Promise<Object>}
 */
export async function deleteAsset(id) {
  return await apiClient(`/api/v1/assets/${id}`, {
    method: 'DELETE',
  });
}
