import type { Platform, PlannedActorRun } from './types';
import { ACTOR_REGISTRY } from './actor-registry';

export function estimatePlanCost(runs: PlannedActorRun[]): number {
  return runs.reduce((total, run) => total + run.estimatedCostCents, 0);
}

export function estimateActorCost(platform: Platform, maxResults: number): number {
  const entry = ACTOR_REGISTRY[platform];
  return Math.ceil(maxResults / 100) * entry.costProfile.estimatedCostPer100;
}

export function formatCostCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatCostRange(estimatedCents: number): string {
  const low = Math.floor(estimatedCents * 0.5);
  const high = Math.ceil(estimatedCents * 1.5);
  return `${formatCostCents(low)} - ${formatCostCents(high)}`;
}
