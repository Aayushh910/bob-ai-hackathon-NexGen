import apiClient from './client';

/**
 * Get fleet-wide maintenance summary and KPIs.
 * @returns {Promise<Object>}
 */
export async function getFleetMaintenanceSummary() {
  return await apiClient('/api/v1/maintenance/statistics/fleet');
}

/**
 * Get fleet-wide prioritized maintenance intervention queue.
 * @param {Object} params - { priority, skip, limit }
 * @returns {Promise<Array>}
 */
export async function getMaintenanceQueue(params = {}) {
  const query = new URLSearchParams();
  if (params.priority) query.append('priority', params.priority);
  if (params.skip !== undefined) query.append('skip', params.skip);
  if (params.limit !== undefined) query.append('limit', params.limit);

  const qs = query.toString();
  return await apiClient(`/api/v1/maintenance/queue${qs ? `?${qs}` : ''}`);
}

/**
 * Get complete maintenance assessment, component insights, and history for an asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function getAssetMaintenanceDetail(assetId) {
  return await apiClient(`/api/v1/maintenance/asset/${assetId}`);
}

/**
 * Generate targeted maintenance intervention plan for an asset.
 * @param {number} assetId
 * @returns {Promise<Object>}
 */
export async function generateInterventionPlan(assetId) {
  return await apiClient(`/api/v1/maintenance/plan/${assetId}`, {
    method: 'POST',
  });
}

/**
 * Update the lifecycle status of a maintenance record.
 * @param {number} recordId
 * @param {Object} payload - { status, performed_by, action_taken, parts_replaced, component_condition, cost }
 * @returns {Promise<Object>}
 */
export async function updateMaintenanceStatus(recordId, payload) {
  return await apiClient(`/api/v1/maintenance/${recordId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Log completed maintenance event and trigger post-maintenance reassessment.
 * @param {Object} payload - { asset_id, component_type, parts_replaced, technician, notes }
 * @returns {Promise<Object>}
 */
export async function completeMaintenance(payload) {
  return await apiClient('/api/v1/maintenance/complete', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * List paginated historical and active maintenance records with filters.
 * @param {Object} params - { asset_id, component_type, maintenance_type, status, failure_occurred, page, page_size }
 * @returns {Promise<Object>}
 */
export async function listMaintenanceRecords(params = {}) {
  const query = new URLSearchParams();
  if (params.asset_id) query.append('asset_id', params.asset_id);
  if (params.component_type) query.append('component_type', params.component_type);
  if (params.maintenance_type) query.append('maintenance_type', params.maintenance_type);
  if (params.status) query.append('status', params.status);
  if (params.failure_occurred !== undefined && params.failure_occurred !== '') {
    query.append('failure_occurred', params.failure_occurred);
  }
  if (params.page !== undefined) query.append('page', params.page);
  if (params.page_size !== undefined) query.append('page_size', params.page_size);

  const qs = query.toString();
  return await apiClient(`/api/v1/maintenance${qs ? `?${qs}` : ''}`);
}
