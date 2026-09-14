import apiClient from './client';
import { API_CONFIG } from '../config/api.config';

/**
 * Checks system and PostgreSQL database health via /api/v1/health.
 * @returns {Promise<{ status: string, service: string, version: string, database: string, database_type: string, timestamp: string }>}
 */
export async function getSystemHealth() {
  return await apiClient(API_CONFIG.ENDPOINTS.HEALTH);
}

/**
 * Checks legacy root /health endpoint.
 */
export async function getRootHealth() {
  return await apiClient(API_CONFIG.ENDPOINTS.ROOT_HEALTH);
}
