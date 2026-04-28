import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import { toPositiveNumber } from '../../cut-size-library/domain/cut-size-geometry'
import type { BuildBatchEngineDemandLinesResult } from './build-batch-engine-demand-lines-from-cutting-plan'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function buildBatchEnginePreview(
  selectedCuttingPlan: CuttingPlan | undefined,
  mappedDemandLines: BuildBatchEngineDemandLinesResult,
  controls: BatchEngineControls
): BatchEngineSimulation {
  if (!selectedCuttingPlan) {
    return {
      ready: false,
      reason: '请选择裁纱单据',
      selectedPlanName: '',
      demandLineCount: 0,
      validDemandLineCount: 0,
      invalidDemandLineCount: 0,
      totalRequiredSets: 0,
      totalRequiredPieces: 0,
      totalDemandAreaM2: 0,
      totalOccupiedAreaM2: 0,
      stripsPerRoll: 0,
      piecesPerStrip: 0,
      executableSets: 0,
      executablePieceCount: 0,
      consumedRawPieces: 0,
      rollAreaM2: 0,
      netAreaM2: 0,
      lossAreaM2: 0,
      utilizationPercent: 0,
      leftoverWidthMm: 0,
      leftoverLengthMm: 0,
    }
  }

  const { validLines, invalidLines } = mappedDemandLines
  const selectedUnit = validLines[0]?.cutSizeGeometry
  const demandLineCount = selectedCuttingPlan.lines.length
  const validDemandLineCount = validLines.length
  const invalidDemandLineCount = invalidLines.length

  if (!selectedUnit || validDemandLineCount <= 0) {
    return {
      ready: false,
      reason: invalidDemandLineCount > 0 ? '裁纱单据缺少可用于求解的有效行' : '裁纱单据暂无可求解行',
      selectedPlanName: selectedCuttingPlan.name,
      demandLineCount,
      validDemandLineCount,
      invalidDemandLineCount,
      totalRequiredSets: 0,
      totalRequiredPieces: 0,
      totalDemandAreaM2: 0,
      totalOccupiedAreaM2: 0,
      stripsPerRoll: 0,
      piecesPerStrip: 0,
      executableSets: 0,
      executablePieceCount: 0,
      consumedRawPieces: 0,
      rollAreaM2: 0,
      netAreaM2: 0,
      lossAreaM2: 0,
      utilizationPercent: 0,
      leftoverWidthMm: 0,
      leftoverLengthMm: 0,
    }
  }

  const rollWidthMm = toPositiveNumber(controls.rollWidthMm)
  const rollLengthMm = toPositiveNumber(controls.rollLengthM) * 1000
  const knifeGapMm = toPositiveNumber(controls.knifeGapMm)
  const edgeTrimMm = toPositiveNumber(controls.edgeTrimMm)
  const pieceWidthMm = validLines[0]?.occupiedWidthMm || selectedUnit.envelopeWidthMm
  const pieceLengthMm = validLines[0]?.occupiedLengthMm || selectedUnit.envelopeLengthMm
  const pieceCountPerSet = validLines[0]?.pieceCountPerSet || selectedUnit.pieceCountPerSet
  const layupCount = validLines[0]?.layupCount || selectedUnit.layupCount
  const totalDemandAreaM2 = round(validLines.reduce((total, item) => total + item.areaM2, 0), 3)
  const totalOccupiedAreaM2 = round(validLines.reduce((total, item) => total + item.occupiedAreaM2, 0), 3)

  if (!rollWidthMm || !rollLengthMm || !pieceWidthMm || !pieceLengthMm) {
    return {
      ready: false,
      reason: '卷材与尺寸参数不足，无法计算',
      selectedPlanName: selectedCuttingPlan.name,
      selectedUnit,
      demandLineCount,
      validDemandLineCount,
      invalidDemandLineCount,
      totalRequiredSets: validLines.reduce((total, item) => total + item.requiredSets, 0),
      totalRequiredPieces: validLines.reduce((total, item) => total + item.requiredPieces, 0),
      totalDemandAreaM2,
      totalOccupiedAreaM2,
      stripsPerRoll: 0,
      piecesPerStrip: 0,
      executableSets: 0,
      executablePieceCount: 0,
      consumedRawPieces: 0,
      rollAreaM2: 0,
      netAreaM2: 0,
      lossAreaM2: 0,
      utilizationPercent: 0,
      leftoverWidthMm: 0,
      leftoverLengthMm: 0,
    }
  }

  const usableWidthMm = Math.max(rollWidthMm - edgeTrimMm * 2, 0)
  const usableLengthMm = Math.max(rollLengthMm - edgeTrimMm * 2, 0)
  const stripPitchMm = pieceWidthMm + knifeGapMm
  const piecePitchMm = pieceLengthMm + knifeGapMm
  const stripsPerRoll = stripPitchMm > 0 ? Math.floor((usableWidthMm + knifeGapMm) / stripPitchMm) : 0
  const piecesPerStrip = piecePitchMm > 0 ? Math.floor((usableLengthMm + knifeGapMm) / piecePitchMm) : 0

  if (stripsPerRoll <= 0 || piecesPerStrip <= 0) {
    return {
      ready: false,
      reason: '当前卷材尺寸无法排出有效长条',
      selectedPlanName: selectedCuttingPlan.name,
      selectedUnit,
      demandLineCount,
      validDemandLineCount,
      invalidDemandLineCount,
      totalRequiredSets: validLines.reduce((total, item) => total + item.requiredSets, 0),
      totalRequiredPieces: validLines.reduce((total, item) => total + item.requiredPieces, 0),
      totalDemandAreaM2,
      totalOccupiedAreaM2,
      stripsPerRoll,
      piecesPerStrip,
      executableSets: 0,
      executablePieceCount: 0,
      consumedRawPieces: 0,
      rollAreaM2: round((rollWidthMm * rollLengthMm) / 1_000_000, 3),
      netAreaM2: 0,
      lossAreaM2: round((rollWidthMm * rollLengthMm) / 1_000_000, 3),
      utilizationPercent: 0,
      leftoverWidthMm: usableWidthMm,
      leftoverLengthMm: usableLengthMm,
    }
  }

  const rawPieces = stripsPerRoll * piecesPerStrip
  const executablePieceCount = Math.floor(rawPieces / layupCount)
  const executableSets = Math.floor(executablePieceCount / pieceCountPerSet)
  const totalRequiredSets = validLines.reduce((total, item) => total + item.requiredSets, 0)
  const totalRequiredPieces = validLines.reduce((total, item) => total + item.requiredPieces, 0)
  const consumedPieces = validLines.reduce(
    (total, item) => total + item.pieceCountPerSet * item.layupCount * item.requiredSets,
    0
  )

  const rollAreaM2 = round((rollWidthMm * rollLengthMm) / 1_000_000, 3)
  const netAreaM2 = round(Math.min(totalOccupiedAreaM2, rollAreaM2), 3)
  const lossAreaM2 = round(Math.max(rollAreaM2 - netAreaM2, 0), 3)
  const utilizationPercent = rollAreaM2 > 0 ? round((netAreaM2 / rollAreaM2) * 100, 2) : 0

  const usedWidthMm = stripsPerRoll * pieceWidthMm + Math.max(stripsPerRoll - 1, 0) * knifeGapMm
  const usedLengthMm = piecesPerStrip * pieceLengthMm + Math.max(piecesPerStrip - 1, 0) * knifeGapMm
  const leftoverWidthMm = Math.max(usableWidthMm - usedWidthMm, 0)
  const leftoverLengthMm = Math.max(usableLengthMm - usedLengthMm, 0)

  return {
    ready: true,
    selectedPlanName: selectedCuttingPlan.name,
    selectedUnit,
    demandLineCount,
    validDemandLineCount,
    invalidDemandLineCount,
    totalRequiredSets,
    totalRequiredPieces,
    totalDemandAreaM2,
    totalOccupiedAreaM2,
    stripsPerRoll,
    piecesPerStrip,
    executableSets,
    executablePieceCount,
    consumedRawPieces: consumedPieces,
    rollAreaM2,
    netAreaM2,
    lossAreaM2,
    utilizationPercent,
    leftoverWidthMm: round(leftoverWidthMm, 1),
    leftoverLengthMm: round(leftoverLengthMm, 1),
  }
}
