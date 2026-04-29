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
  BatchEngineMetric,
} from './types/batch-engine-ui'
export type {
  BatchOptimizerBreakSliceSummary,
  BatchOptimizerDemandLineInput,
  BatchOptimizerHeatZoneAttribution,
  BatchOptimizerMustFulfillDiagnostic,
  BatchOptimizerObjectivePreset,
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
  BatchOptimizerPlanLayoutDemandSummary,
  BatchOptimizerPlanAssignment,
  BatchOptimizerPlanReportSummary,
  BatchOptimizerPlanScoreBreakdown,
  BatchOptimizerRollInput,
  BatchOptimizerScoreWeights,
  BatchOptimizerSolveRequest,
  BatchOptimizerSolveResponse,
  BatchOptimizerUnfulfilledLine,
  BatchOptimizerZoneClusterSummary,
} from './types/batch-engine-api'
