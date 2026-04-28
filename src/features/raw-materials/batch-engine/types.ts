 import type { TranslationKey } from '@/locales'

 export type BatchEngineTranslate = (
   key: TranslationKey,
   params?: Record<string, string | number>
 ) => string

export type { BatchEngineControls, BatchEngineSimulation } from './types/batch-engine-domain'
export type {
  BatchEngineLegendItem,
  BatchEngineLegendTone,
  BatchEngineMetric,
} from './types/batch-engine-ui'
export type {
  BatchOptimizerDemandLineInput,
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
} from './types/batch-engine-api'
