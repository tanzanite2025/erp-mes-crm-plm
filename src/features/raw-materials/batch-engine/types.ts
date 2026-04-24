import type { CutSizeUnit } from '../cut-size-library/data/cut-size-library-schema'

export type BatchEngineLegendTone = 'roll' | 'strip' | 'piece' | 'loss'

export type BatchEngineLegendItem = {
  key: string
  label: string
  tone: BatchEngineLegendTone
}

export type BatchEngineMetric = {
  key: string
  label: string
  value: string
  hint: string
}

export type BatchEngineRuleChip = {
  key: string
  label: string
  tone?: 'default' | 'accent' | 'warn'
}

export type BatchEngineControls = {
  selectedCutSizeId: string
  rollWidthMm: string
  rollLengthM: string
  knifeGapMm: string
  edgeTrimMm: string
}

export type BatchEngineStripVisual = {
  id: string
  title: string
  pieceCount: number
  previewPieceCount: number
}

export type BatchEngineSimulation = {
  ready: boolean
  reason?: string
  selectedUnit?: CutSizeUnit
  stripsPerRoll: number
  piecesPerStrip: number
  executableSets: number
  executablePieceCount: number
  consumedRawPieces: number
  rollAreaM2: number
  netAreaM2: number
  lossAreaM2: number
  utilizationPercent: number
  leftoverWidthMm: number
  leftoverLengthMm: number
  stripVisuals: BatchEngineStripVisual[]
}
