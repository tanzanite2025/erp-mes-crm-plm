import type { BatchOptimizerPlan } from '../types'
import {
  resolvePhase7ExplainabilitySourceLabel,
  selectSecondaryBreakSlices,
  selectSecondaryZoneClusters,
  selectTopBreakSlices,
  selectTopZoneClusters,
} from './batch-engine-phase7-display'

export function resolvePrimaryBreakSlice(
  selectedPlan: BatchOptimizerPlan | undefined
) {
  return selectTopBreakSlices(selectedPlan, 1)[0]
}

export function resolvePrimaryZoneCluster(
  selectedPlan: BatchOptimizerPlan | undefined
) {
  return selectTopZoneClusters(selectedPlan, 1)[0]
}

export function resolveSecondaryBreakSlices(
  selectedPlan: BatchOptimizerPlan | undefined,
  limit: number
) {
  return selectSecondaryBreakSlices(selectedPlan, limit)
}

export function resolveSecondaryZoneClusters(
  selectedPlan: BatchOptimizerPlan | undefined,
  limit: number
) {
  return selectSecondaryZoneClusters(selectedPlan, limit)
}

export function resolveExplainabilitySourceLabel(
  source: '' | 'home-entry' | 'preview-switch'
) {
  return resolvePhase7ExplainabilitySourceLabel(source)
}
