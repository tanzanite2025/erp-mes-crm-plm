import type { CuttingPlanLine } from '@/features/engineering-db/data/cutting-plan-schema'
import {
  type CutSizeDisplaySnapshot,
  type CutSizeGeometryProjection,
  toPositiveNumber,
} from '../../cut-size-library/domain/cut-size-geometry'
import type {
  BatchEngineResolvedDemandLine,
  BatchEngineResolvedDemandLineRules,
} from './batch-engine-demand-line-types'

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Math.floor(toPositiveNumber(value))
  return parsed > 0 ? parsed : fallback
}

export function getBatchEngineDemandLineLabel(line: CuttingPlanLine, display?: CutSizeDisplaySnapshot) {
  const expression = line.sizeExpression?.trim() || display?.sizeExpression || '--'
  const code = line.cutSizeCode?.trim() || display?.code || '--'
  return `#${line.sequenceNo} / ${code} / ${expression}`
}

type MapBatchEngineDemandLineOptions = {
  demandLineId: string
  line: CuttingPlanLine
  cutSizeGeometry: CutSizeGeometryProjection
  cutSizeDisplay: CutSizeDisplaySnapshot
  rules: BatchEngineResolvedDemandLineRules
}

export function mapBatchEngineDemandLine(options: MapBatchEngineDemandLineOptions): BatchEngineResolvedDemandLine {
  const { demandLineId, line, cutSizeGeometry, cutSizeDisplay, rules } = options
  const widthMm = cutSizeGeometry.widthMm
  const lengthMm = cutSizeGeometry.lengthMm
  const pieceCountPerSet = cutSizeGeometry.pieceCountPerSet
  const layupCount = cutSizeGeometry.layupCount
  const requiredSets = normalizePositiveInteger(line.requiredSets, 1)
  const requiredPieces = requiredSets * pieceCountPerSet
  const areaM2 = round(cutSizeGeometry.baseAreaM2 * pieceCountPerSet * layupCount * requiredSets, 3)
  const occupiedPieceAreaM2 = cutSizeGeometry.envelopeAreaM2
  const occupiedAreaM2 = round(occupiedPieceAreaM2 * pieceCountPerSet * layupCount * requiredSets, 3)

  return {
    demandLineId,
    cutSizeUnitId: cutSizeGeometry.cutSizeUnitId,
    widthMm,
    lengthMm,
    pieceCountPerSet,
    requiredSets,
    requiredPieces,
    layupCount,
    cutAngle: cutSizeGeometry.cutAngleDeg,
    usageType: rules.usageType,
    priority: rules.priority,
    allowMixedPlan: rules.allowMixedPlan,
    mustFulfill: rules.mustFulfill,
    rollGroupKey: rules.rollGroupKey,
    orderSequence: rules.orderSequence,
    yarnDirectionMode: rules.yarnDirectionMode,
    processTags: rules.processTags,
    noteKeywords: rules.noteKeywords,
    sequenceNo: line.sequenceNo,
    areaM2,
    occupiedWidthMm: cutSizeGeometry.envelopeWidthMm,
    occupiedLengthMm: cutSizeGeometry.envelopeLengthMm,
    occupiedAreaM2,
    occupiedPieceAreaM2,
    lineLabel: getBatchEngineDemandLineLabel(line, cutSizeDisplay),
    cutSizeGeometry,
    cutSizeDisplay,
    sourceLine: line,
  }
}
