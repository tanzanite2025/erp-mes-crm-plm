import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import {
  formatCutSizeExpression,
  toPositiveNumber,
  type CutSizeUnit,
} from '../../cut-size-library/data/cut-size-library-schema'
import { CutSizeLibraryService } from '../../cut-size-library/services/cut-size-library-service'
import type {
  BatchEngineControls,
  BatchEngineLegendItem,
  BatchEngineMetric,
  BatchEngineRuleChip,
  BatchEngineSimulation,
} from '../types'

const CUT_SIZE_LIBRARY_OPTIONS_QUERY_KEY = ['raw-materials', 'cut-size-library', 'active-options'] as const

const DEFAULT_CONTROLS: BatchEngineControls = {
  selectedCutSizeId: '',
  rollWidthMm: '1000',
  rollLengthM: '150',
  knifeGapMm: '2',
  edgeTrimMm: '0',
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function buildSimulation(selectedUnit: CutSizeUnit | undefined, controls: BatchEngineControls): BatchEngineSimulation {
  if (!selectedUnit) {
    return {
      ready: false,
      reason: '请选择裁切尺寸单元',
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
      stripVisuals: [],
    }
  }

  const rollWidthMm = toPositiveNumber(controls.rollWidthMm)
  const rollLengthMm = toPositiveNumber(controls.rollLengthM) * 1000
  const knifeGapMm = toPositiveNumber(controls.knifeGapMm)
  const edgeTrimMm = Math.max(
    toPositiveNumber(controls.edgeTrimMm),
    toPositiveNumber(selectedUnit.edgeTrimMm)
  )
  const pieceWidthMm = toPositiveNumber(selectedUnit.widthMm)
  const pieceLengthMm = toPositiveNumber(selectedUnit.lengthMm)
  const pieceCountPerSet = Math.max(1, Math.floor(toPositiveNumber(selectedUnit.pieceCount) || 1))
  const layupCount = Math.max(1, Math.floor(toPositiveNumber(selectedUnit.layupCount) || 1))

  if (!rollWidthMm || !rollLengthMm || !pieceWidthMm || !pieceLengthMm) {
    return {
      ready: false,
      reason: '卷材与尺寸参数不足，无法计算',
      selectedUnit,
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
      stripVisuals: [],
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
      selectedUnit,
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
      stripVisuals: [],
    }
  }

  const rawPieces = stripsPerRoll * piecesPerStrip
  const executablePieceCount = Math.floor(rawPieces / layupCount)
  const executableSets = Math.floor(executablePieceCount / pieceCountPerSet)
  const consumedPieces = executableSets * pieceCountPerSet * layupCount

  const rollAreaM2 = round((rollWidthMm * rollLengthMm) / 1_000_000, 3)
  const netAreaM2 = round((consumedPieces * pieceWidthMm * pieceLengthMm) / 1_000_000, 3)
  const lossAreaM2 = round(Math.max(rollAreaM2 - netAreaM2, 0), 3)
  const utilizationPercent = rollAreaM2 > 0 ? round((netAreaM2 / rollAreaM2) * 100, 2) : 0

  const usedWidthMm = stripsPerRoll * pieceWidthMm + Math.max(stripsPerRoll - 1, 0) * knifeGapMm
  const usedLengthMm = piecesPerStrip * pieceLengthMm + Math.max(piecesPerStrip - 1, 0) * knifeGapMm
  const leftoverWidthMm = Math.max(usableWidthMm - usedWidthMm, 0)
  const leftoverLengthMm = Math.max(usableLengthMm - usedLengthMm, 0)

  const stripVisuals = Array.from({ length: Math.min(stripsPerRoll, 6) }, (_, index) => ({
    id: `strip-${index + 1}`,
    title: `长条 ${index + 1}`,
    pieceCount: piecesPerStrip,
    previewPieceCount: Math.min(piecesPerStrip, 8),
  }))

  return {
    ready: true,
    selectedUnit,
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
    stripVisuals,
  }
}

export function useBatchEngineState() {
  const { t } = useLanguage()
  const [controls, setControls] = useState<BatchEngineControls>(DEFAULT_CONTROLS)

  const { data: cutSizeUnits = [], isLoading: cutSizeLoading } = useQuery({
    queryKey: CUT_SIZE_LIBRARY_OPTIONS_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.listActive(),
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (controls.selectedCutSizeId || cutSizeUnits.length === 0) return
    setControls((current) => ({
      ...current,
      selectedCutSizeId: cutSizeUnits[0]?.id || '',
    }))
  }, [controls.selectedCutSizeId, cutSizeUnits])

  const selectedCutSize = useMemo(
    () => cutSizeUnits.find((item) => item.id === controls.selectedCutSizeId),
    [controls.selectedCutSizeId, cutSizeUnits]
  )

  const simulation = useMemo(
    () => buildSimulation(selectedCutSize, controls),
    [selectedCutSize, controls]
  )

  const metrics = useMemo<BatchEngineMetric[]>(
    () => [
      {
        key: 'roll',
        label: t('rawMaterials.batchEngine.metrics.roll.label'),
        value: `${controls.rollLengthM || '--'}m x ${controls.rollWidthMm || '--'}mm`,
        hint: t('rawMaterials.batchEngine.metrics.roll.hint'),
      },
      {
        key: 'mode',
        label: t('rawMaterials.batchEngine.metrics.mode.label'),
        value: t('rawMaterials.batchEngine.metrics.mode.value'),
        hint: selectedCutSize
          ? `当前尺寸单元: ${selectedCutSize.code} / ${formatCutSizeExpression(selectedCutSize) || '--'}`
          : t('rawMaterials.batchEngine.metrics.mode.hint'),
      },
      {
        key: 'loss',
        label: t('rawMaterials.batchEngine.metrics.loss.label'),
        value: `${simulation.lossAreaM2.toFixed(3)} m2`,
        hint: simulation.ready
          ? `利用率 ${simulation.utilizationPercent.toFixed(2)}%`
          : t('rawMaterials.batchEngine.metrics.loss.hint'),
      },
    ],
    [controls.rollLengthM, controls.rollWidthMm, selectedCutSize, simulation, t]
  )

  const ruleChips = useMemo<BatchEngineRuleChip[]>(
    () => [
      {
        key: 'strip-first',
        label: t('rawMaterials.batchEngine.rules.stripFirst'),
        tone: 'accent',
      },
      {
        key: 'angle',
        label: t('rawMaterials.batchEngine.rules.angleAware'),
      },
      {
        key: 'layup',
        label: t('rawMaterials.batchEngine.rules.layupAware'),
      },
      {
        key: 'loss',
        label: t('rawMaterials.batchEngine.rules.lossAware'),
        tone: 'warn',
      },
    ],
    [t]
  )

  const legend = useMemo<BatchEngineLegendItem[]>(
    () => [
      {
        key: 'roll',
        label: t('rawMaterials.batchEngine.legend.roll'),
        tone: 'roll',
      },
      {
        key: 'strip',
        label: t('rawMaterials.batchEngine.legend.strip'),
        tone: 'strip',
      },
      {
        key: 'piece',
        label: t('rawMaterials.batchEngine.legend.piece'),
        tone: 'piece',
      },
      {
        key: 'loss',
        label: t('rawMaterials.batchEngine.legend.loss'),
        tone: 'loss',
      },
    ],
    [t]
  )

  const updateControl = <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => {
    setControls((current) => ({ ...current, [key]: value }))
  }

  return {
    metrics,
    ruleChips,
    legend,
    controls,
    updateControl,
    cutSizeUnits,
    cutSizeLoading,
    selectedCutSize,
    simulation,
  }
}
