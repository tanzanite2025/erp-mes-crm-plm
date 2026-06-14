import type {
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
} from '../types'

export type BatchEnginePreviewDisplayMode = 'local-preview' | 'solved-plan'

export type BatchEnginePreviewDisplayState = {
  mode: BatchEnginePreviewDisplayMode
  selectedPlan?: BatchOptimizerPlan
  diffSummary?: BatchOptimizerPlanDiffSummary
}

export function resolveBatchEnginePreviewDisplayState(
  selectedPlan: BatchOptimizerPlan | undefined,
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
): BatchEnginePreviewDisplayState {
  return {
    mode: selectedPlan ? 'solved-plan' : 'local-preview',
    selectedPlan,
    diffSummary: selectedPlan
      ? (activeDiffSummary ?? selectedPlan.diffSummary)
      : undefined,
  }
}

export function resolveBatchEnginePreviewDialogTitle(
  displayState: BatchEnginePreviewDisplayState,
  fallbackTitle: string
) {
  return displayState.mode === 'solved-plan' ? '正式方案视图' : fallbackTitle
}

export function resolveBatchEnginePreviewDialogDescription(
  displayState: BatchEnginePreviewDisplayState,
  fallbackDescription: string
) {
  return displayState.mode === 'solved-plan'
    ? '当前弹窗已切换到正式方案布局摘要视图，并与选中方案保持同步。'
    : fallbackDescription
}
