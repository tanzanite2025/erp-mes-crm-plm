import type { BatchOptimizerPlan } from '../types'
import type { BatchEngineExplainabilityTargetSource } from './batch-engine-phase7-visualization'

export function selectTopBreakSlices(selectedPlan: BatchOptimizerPlan | undefined, limit: number) {
  return [...(selectedPlan?.explainabilitySummary.breakSlices ?? [])]
    .sort((left, right) => right.severityScore - left.severityScore)
    .slice(0, limit)
}

export function selectTopZoneClusters(selectedPlan: BatchOptimizerPlan | undefined, limit: number) {
  return [...(selectedPlan?.explainabilitySummary.zoneClusters ?? [])]
    .sort((left, right) => right.densityScore - left.densityScore)
    .slice(0, limit)
}

export function selectSecondaryBreakSlices(selectedPlan: BatchOptimizerPlan | undefined, limit: number) {
  return selectTopBreakSlices(selectedPlan, limit + 1).slice(1)
}

export function selectSecondaryZoneClusters(selectedPlan: BatchOptimizerPlan | undefined, limit: number) {
  return selectTopZoneClusters(selectedPlan, limit + 1).slice(1)
}

export function resolvePhase7ExplainabilitySourceLabel(source: BatchEngineExplainabilityTargetSource) {
  if (source === 'home-entry') {
    return '首页入口'
  }
  if (source === 'preview-switch') {
    return '弹窗切换'
  }
  return ''
}

export function buildPhase7BreakSliceBadgeLabel(id: string) {
  return `slice ${id}`
}

export function buildPhase7ZoneClusterBadgeLabel(clusterId: string) {
  return `cluster ${clusterId}`
}

export function buildPhase7SeverityBadgeLabel(severityScore: number) {
  return `severity ${severityScore.toFixed(2)}`
}

export function buildPhase7DensityBadgeLabel(densityScore: number) {
  return `density ${densityScore.toFixed(2)}`
}

export function buildPhase7BudgetQuotaBadgeLabel(targetQuota: number) {
  return `quota ${targetQuota}`
}

export function buildPhase7BudgetPriorityBadgeLabel(priorityScore: number) {
  return `priority ${priorityScore.toFixed(2)}`
}

export function buildPhase7BudgetRerankBadgeLabel() {
  return 'budget rerank'
}
