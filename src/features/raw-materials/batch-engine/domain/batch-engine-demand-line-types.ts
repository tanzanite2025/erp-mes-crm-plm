import type { CuttingPlanLine } from '@/features/engineering-db/data/cutting-plan-schema'
import type {
  CutSizeDisplaySnapshot,
  CutSizeGeometryProjection,
} from '../../cut-size-library/domain/cut-size-geometry'
import type { BatchOptimizerDemandLineInput } from '../types'

export type BatchEngineResolvedDemandLine = BatchOptimizerDemandLineInput & {
  sequenceNo: number
  areaM2: number
  occupiedWidthMm: number
  occupiedLengthMm: number
  occupiedAreaM2: number
  occupiedPieceAreaM2: number
  lineLabel: string
  cutSizeGeometry: CutSizeGeometryProjection
  cutSizeDisplay: CutSizeDisplaySnapshot
  sourceLine: CuttingPlanLine
}

export type BatchEngineInvalidDemandLine = {
  demandLineId: string
  sequenceNo: number
  lineLabel: string
  reason: string
  line: CuttingPlanLine
}

export type BuildBatchEngineDemandLinesResult = {
  validLines: BatchEngineResolvedDemandLine[]
  invalidLines: BatchEngineInvalidDemandLine[]
}

export type BatchEngineResolvedDemandLineRules = {
  priority: number
  allowMixedPlan: boolean
  mustFulfill: boolean
  usageType: string
  rollGroupKey: string
  orderSequence: number
  yarnDirectionMode: string
  processTags: string[]
  noteKeywords: string[]
}
