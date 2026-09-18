import apiClient from './client';
import { getCriticalComponents, getHighPriorityComponents } from './dashboard';

/**
 * Fetch critical priority components across the fleet.
 */
export async function getCriticalComponentPredictions() {
  return await getCriticalComponents();
}

/**
 * Fetch high priority components across the fleet.
 */
export async function getHighPriorityComponentPredictions() {
  return await getHighPriorityComponents();
}

/**
 * Fetch ML predictions for a specific component.
 */
export async function getComponentPredictions(componentId) {
  return await apiClient(`/api/v1/components/${encodeURIComponent(componentId)}/predictions`);
}

/**
 * Fetch TreeSHAP feature attributions for a component.
 */
export async function getComponentExplanation(componentId) {
  return await apiClient(`/api/v1/components/${encodeURIComponent(componentId)}/explanation`);
}
