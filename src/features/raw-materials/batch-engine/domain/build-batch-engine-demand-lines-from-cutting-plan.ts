import type {
  CuttingPlan,
  CuttingPlanLine,
} from '@/features/engineering-db/data/cutting-plan-schema'
import { type CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import {
  resolveCutSizeGeometryProjection,
  toPositiveNumber,
  type CutSizeDisplaySnapshot,
  type CutSizeGeometryProjection,
} from '../../cut-size-library/domain/cut-size-geometry'
import type { BatchOptimizerDemandLineInput } from '../types'

type BatchEngineResolvedDemandLine = BatchOptimizerDemandLineInput & {
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

type BatchEngineInvalidDemandLine = {
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

function round(value: number, digits = 3) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function getLineLabel(line: CuttingPlanLine, display?: CutSizeDisplaySnapshot) {
  const expression = line.sizeExpression?.trim() || display?.sizeExpression || '--'
  const code = line.cutSizeCode?.trim() || display?.code || '--'
  return `#${line.sequenceNo} / ${code} / ${expression}`
}

function normalizePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Math.floor(toPositiveNumber(value))
  return parsed > 0 ? parsed : fallback
}

function hasExplicitInvalidPositiveInteger(value: string | undefined) {
  const raw = value?.trim() || ''
  if (!raw) return false
  return Math.floor(toPositiveNumber(raw)) <= 0
}

function normalizePriority(line: CuttingPlanLine, index: number) {
  const explicitPriority = Math.floor(toPositiveNumber(line.priority))
  if (explicitPriority > 0) return explicitPriority

  const orderedPriority = Math.floor(toPositiveNumber(line.constraintProfile?.orderSequence))
  if (orderedPriority > 0) {
    return Math.max(1, 10_000 - orderedPriority)
  }

  return Math.max(1, 100 - index)
}

function resolveAllowMixedPlan(line: CuttingPlanLine) {
  if (typeof line.allowMixedPlan === 'boolean') return line.allowMixedPlan
  return !(
    line.constraintProfile?.processTags?.some((item) => item.toLowerCase() === 'no-mix') ||
    line.constraintProfile?.noteKeywords?.some((item) => item.toLowerCase() === 'no-mix')
  )
}

function resolveMustFulfill(line: CuttingPlanLine) {
  if (typeof line.mustFulfill === 'boolean') return line.mustFulfill
  return !line.constraintProfile?.noteKeywords?.some((item) => item.toLowerCase() === 'optional')
}

function resolveUsageType(line: CuttingPlanLine, unit: CutSizeUnit) {
  return (
    line.constraintProfile?.yarnDirectionMode?.trim() ||
    line.yarnDirection?.trim() ||
    unit.usageType?.trim() ||
    'default'
  )
}

function normalizeRuleStringArray(values: string[] | undefined) {
  return (values || []).map((item) => item.trim()).filter(Boolean)
}

export function buildBatchEngineDemandLinesFromCuttingPlan(
  cuttingPlan: CuttingPlan | undefined,
  cutSizeUnits: CutSizeUnit[]
): BuildBatchEngineDemandLinesResult {
  if (!cuttingPlan) {
    return {
      validLines: [],
      invalidLines: [],
    }
  }

  const validLines: BatchEngineResolvedDemandLine[] = []
  const invalidLines: BatchEngineInvalidDemandLine[] = []

  cuttingPlan.lines.forEach((line, index) => {
    const demandLineId = line.id || `${cuttingPlan.id}-line-${index + 1}`
    const baseLabel = getLineLabel(line)

    if (!line.cutSizeId?.trim()) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: baseLabel,
        reason: '未绑定尺寸单元',
        line,
      })
      return
    }

    const cutSizeUnit = cutSizeUnits.find((item) => item.id === line.cutSizeId)
    if (!cutSizeUnit) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: baseLabel,
        reason: '关联尺寸单元不存在或未启用',
        line,
      })
      return
    }

    const { geometry: cutSizeGeometry, display: cutSizeDisplay } = resolveCutSizeGeometryProjection(cutSizeUnit)
    const widthMm = cutSizeGeometry.widthMm
    const lengthMm = cutSizeGeometry.lengthMm
    const pieceCountPerSet = cutSizeGeometry.pieceCountPerSet
    const layupCount = cutSizeGeometry.layupCount

    if (!widthMm || !lengthMm) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: getLineLabel(line, cutSizeDisplay),
        reason: '尺寸单元缺少有效宽长',
        line,
      })
      return
    }

    if (hasExplicitInvalidPositiveInteger(line.requiredSets)) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: getLineLabel(line, cutSizeDisplay),
        reason: '需求套数必须为大于 0 的整数',
        line,
      })
      return
    }

    if (hasExplicitInvalidPositiveInteger(line.priority)) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: getLineLabel(line, cutSizeDisplay),
        reason: '优先级必须为大于 0 的整数',
        line,
      })
      return
    }

    const requiredSets = normalizePositiveInteger(line.requiredSets, 1)
    const requiredPieces = requiredSets * pieceCountPerSet
    const areaM2 = round(cutSizeGeometry.baseAreaM2 * pieceCountPerSet * layupCount * requiredSets, 3)
    const occupiedPieceAreaM2 = cutSizeGeometry.envelopeAreaM2
    const occupiedAreaM2 = round(occupiedPieceAreaM2 * pieceCountPerSet * layupCount * requiredSets, 3)
    const priority = normalizePriority(line, index)
    const allowMixedPlan = resolveAllowMixedPlan(line)
    const mustFulfill = resolveMustFulfill(line)
    const rollGroupKey = line.constraintProfile?.rollGroupKey?.trim() || ''
    const orderSequence = Math.floor(toPositiveNumber(line.constraintProfile?.orderSequence))
    const yarnDirectionMode = line.constraintProfile?.yarnDirectionMode?.trim() || line.yarnDirection?.trim() || ''
    const processTags = normalizeRuleStringArray(line.constraintProfile?.processTags)
    const noteKeywords = normalizeRuleStringArray(line.constraintProfile?.noteKeywords)

    validLines.push({
      demandLineId,
      cutSizeUnitId: cutSizeGeometry.cutSizeUnitId,
      widthMm,
      lengthMm,
      pieceCountPerSet,
      requiredSets,
      requiredPieces,
      layupCount,
      cutAngle: cutSizeGeometry.cutAngleDeg,
      usageType: resolveUsageType(line, cutSizeUnit),
      priority,
      allowMixedPlan,
      mustFulfill,
      rollGroupKey,
      orderSequence,
      yarnDirectionMode,
      processTags,
      noteKeywords,
      sequenceNo: line.sequenceNo,
      areaM2,
      occupiedWidthMm: cutSizeGeometry.envelopeWidthMm,
      occupiedLengthMm: cutSizeGeometry.envelopeLengthMm,
      occupiedAreaM2,
      occupiedPieceAreaM2,
      lineLabel: getLineLabel(line, cutSizeDisplay),
      cutSizeGeometry,
      cutSizeDisplay,
      sourceLine: line,
    })
  })

  return {
    validLines,
    invalidLines,
  }
}
