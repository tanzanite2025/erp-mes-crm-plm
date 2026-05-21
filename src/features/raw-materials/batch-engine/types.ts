 import type { TranslationKey } from '@/locales'

export type BatchEngineTranslate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export type { BatchEngineControls, BatchEngineSimulation } from './types/batch-engine-domain'
export type {
  BatchEngineNormalizedControls,
  BatchEngineResolvedControls,
  BatchEngineResolvedControlState,
} from './types/batch-engine-domain'
export type {
  BatchEngineLegendItem,
  BatchEngineLegendTone,
} from './types/batch-engine-ui'
export type {
  BatchOptimizerBreakSliceSummary,
  BatchOptimizerDemandLineInput,
  BatchOptimizerHeatZoneAttribution,
  BatchOptimizerMustFulfillDiagnostic,
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
  BatchOptimizerPlanLayoutDemandSummary,
  BatchOptimizerPlanAssignment,
  BatchOptimizerPlanReportSummary,
  BatchOptimizerPlanScoreBreakdown,
  BatchOptimizerScoreWeights,
  BatchOptimizerSolveResponse,
  BatchOptimizerUnfulfilledLine,
  BatchOptimizerZoneClusterSummary,
} from './types/batch-engine-api'
