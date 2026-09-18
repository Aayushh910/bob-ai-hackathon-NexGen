import apiClient from './client';

/**
 * Submit operational query to SentinelAI Copilot.
 * @param {string} query
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function askCopilotQuery(query, assetId = null) {
  const numericAssetId = typeof assetId === 'number' ? assetId : null;
  return await apiClient('/api/v1/copilot/query', {
    method: 'POST',
    body: JSON.stringify({
      query: String(query || '').trim(),
      asset_id: numericAssetId,
    }),
  });
}

/**
 * Get list of supported operational intents.
 * @returns {Promise<Object>}
 */
export async function getSupportedIntents() {
  return await apiClient('/api/v1/copilot/intents');
}
