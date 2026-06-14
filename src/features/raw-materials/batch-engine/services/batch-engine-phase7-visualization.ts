import type { BatchOptimizerPlan } from '../types'

export type BatchEngineExplainabilityTargetKind =
  | 'break-slice'
  | 'zone-cluster'
  | ''

export type BatchEngineExplainabilityTargetSource =
  | 'home-entry'
  | 'preview-switch'
  | ''

export type BatchEngineExplainabilityTarget = {
  targetId: string
  targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''>
}

export function resolveBatchEngineExplainabilityHighlightZoneIds(
  selectedPlan: BatchOptimizerPlan | undefined,
  targetId: string,
  targetKind: BatchEngineExplainabilityTargetKind
) {
  if (!selectedPlan || !targetId) {
    return []
  }
  if (targetKind === 'break-slice') {
    return (
      selectedPlan.explainabilitySummary.breakSlices.find(
        (item) => item.id === targetId
      )?.zoneIds ?? []
    )
  }
  if (targetKind === 'zone-cluster') {
    return (
      selectedPlan.explainabilitySummary.zoneClusters.find(
        (item) => item.clusterId === targetId
      )?.zoneIds ?? []
    )
  }
  return []
}
