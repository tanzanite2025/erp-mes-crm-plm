import {
  toPositiveNumber,
  type CutSizeUnit,
} from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'

export type StripLayoutZoneKind = 'roll' | 'loss' | 'strip' | 'piece' | 'aggregate'

export type StripLayoutZone = {
  id: string
  kind: StripLayoutZoneKind
  x: number
  y: number
  width: number
  height: number
  label: string
  detail?: string
  interactive?: boolean
}

export type StripFirstLayout = {
  widthMm: number
  heightMm: number
  zones: StripLayoutZone[]
  bounds: {
    minX: number
    minY: number
    maxX: number
    maxY: number
  }
}

const MAX_RENDER_STRIPS = 32
const MAX_RENDER_PIECES_PER_STRIP = 48

function buildLossZones(
  zones: StripLayoutZone[],
  edgeTrimMm: number,
  rollWidthMm: number,
  rollLengthMm: number
) {
  if (edgeTrimMm <= 0) return

  zones.push({
    id: 'loss-left-trim',
    kind: 'loss',
    x: 0,
    y: 0,
    width: edgeTrimMm,
    height: rollLengthMm,
    label: 'Loss: Left Trim',
    detail: `Edge trim ${edgeTrimMm.toFixed(1)}mm`,
  })

  zones.push({
    id: 'loss-right-trim',
    kind: 'loss',
    x: rollWidthMm - edgeTrimMm,
    y: 0,
    width: edgeTrimMm,
    height: rollLengthMm,
    label: 'Loss: Right Trim',
    detail: `Edge trim ${edgeTrimMm.toFixed(1)}mm`,
  })

  zones.push({
    id: 'loss-top-trim',
    kind: 'loss',
    x: edgeTrimMm,
    y: 0,
    width: Math.max(rollWidthMm - edgeTrimMm * 2, 0),
    height: edgeTrimMm,
    label: 'Loss: Top Trim',
    detail: `Edge trim ${edgeTrimMm.toFixed(1)}mm`,
  })

  zones.push({
    id: 'loss-bottom-trim',
    kind: 'loss',
    x: edgeTrimMm,
    y: rollLengthMm - edgeTrimMm,
    width: Math.max(rollWidthMm - edgeTrimMm * 2, 0),
    height: edgeTrimMm,
    label: 'Loss: Bottom Trim',
    detail: `Edge trim ${edgeTrimMm.toFixed(1)}mm`,
  })
}

function computeGeometry(
  selectedUnit: CutSizeUnit,
  controls: BatchEngineControls
) {
  const rollWidthMm = Math.max(toPositiveNumber(controls.rollWidthMm), 1)
  const rollLengthMm = Math.max(toPositiveNumber(controls.rollLengthM) * 1000, 1)
  const knifeGapMm = Math.max(toPositiveNumber(controls.knifeGapMm), 0)
  const edgeTrimMm = Math.max(
    toPositiveNumber(controls.edgeTrimMm),
    toPositiveNumber(selectedUnit.edgeTrimMm),
  )
  const pieceWidthMm = Math.max(toPositiveNumber(selectedUnit.widthMm), 0)
  const pieceLengthMm = Math.max(toPositiveNumber(selectedUnit.lengthMm), 0)

  const usableX = edgeTrimMm
  const usableY = edgeTrimMm
  const usableWidthMm = Math.max(rollWidthMm - edgeTrimMm * 2, 0)
  const usableLengthMm = Math.max(rollLengthMm - edgeTrimMm * 2, 0)

  return {
    rollWidthMm,
    rollLengthMm,
    knifeGapMm,
    edgeTrimMm,
    pieceWidthMm,
    pieceLengthMm,
    usableX,
    usableY,
    usableWidthMm,
    usableLengthMm,
  }
}

export function buildStripFirstLayout(
  controls: BatchEngineControls,
  simulation: BatchEngineSimulation
): StripFirstLayout {
  const selectedUnit = simulation.selectedUnit
  const fallbackWidth = Math.max(toPositiveNumber(controls.rollWidthMm), 1)
  const fallbackHeight = Math.max(toPositiveNumber(controls.rollLengthM) * 1000, 1)

  if (!selectedUnit) {
    return {
      widthMm: fallbackWidth,
      heightMm: fallbackHeight,
      zones: [
        {
          id: 'roll-empty',
          kind: 'roll',
          x: 0,
          y: 0,
          width: fallbackWidth,
          height: fallbackHeight,
          label: 'Roll Area',
        },
      ],
      bounds: {
        minX: 0,
        minY: 0,
        maxX: fallbackWidth,
        maxY: fallbackHeight,
      },
    }
  }

  const {
    rollWidthMm,
    rollLengthMm,
    knifeGapMm,
    edgeTrimMm,
    pieceWidthMm,
    pieceLengthMm,
    usableX,
    usableY,
    usableWidthMm,
    usableLengthMm,
  } = computeGeometry(selectedUnit, controls)

  const zones: StripLayoutZone[] = [
    {
      id: 'roll',
      kind: 'roll',
      x: 0,
      y: 0,
      width: rollWidthMm,
      height: rollLengthMm,
      label: 'Roll Area',
      detail: `${rollLengthMm.toFixed(0)}mm x ${rollWidthMm.toFixed(0)}mm`,
    },
  ]

  buildLossZones(zones, edgeTrimMm, rollWidthMm, rollLengthMm)

  if (!simulation.ready || pieceWidthMm <= 0 || pieceLengthMm <= 0) {
    return {
      widthMm: rollWidthMm,
      heightMm: rollLengthMm,
      zones,
      bounds: { minX: 0, minY: 0, maxX: rollWidthMm, maxY: rollLengthMm },
    }
  }

  const stripsPerRoll = Math.max(simulation.stripsPerRoll, 0)
  const piecesPerStrip = Math.max(simulation.piecesPerStrip, 0)
  const stripPitchMm = pieceWidthMm + knifeGapMm
  const piecePitchMm = pieceLengthMm + knifeGapMm

  const renderedStripCount = Math.min(stripsPerRoll, MAX_RENDER_STRIPS)
  const renderedPieceCount = Math.min(piecesPerStrip, MAX_RENDER_PIECES_PER_STRIP)

  const usedLengthMm = Math.min(
    piecesPerStrip * pieceLengthMm + Math.max(piecesPerStrip - 1, 0) * knifeGapMm,
    usableLengthMm
  )

  for (let stripIndex = 0; stripIndex < renderedStripCount; stripIndex += 1) {
    const stripX = usableX + stripIndex * stripPitchMm
    if (stripX >= usableX + usableWidthMm) break

    const stripWidth = Math.min(pieceWidthMm, usableX + usableWidthMm - stripX)
    if (stripWidth <= 0) continue

    const stripId = `strip-${stripIndex + 1}`
    zones.push({
      id: stripId,
      kind: 'strip',
      x: stripX,
      y: usableY,
      width: stripWidth,
      height: usedLengthMm,
      label: `Strip ${stripIndex + 1}`,
      detail: `Pieces ${piecesPerStrip}`,
      interactive: true,
    })

    for (let pieceIndex = 0; pieceIndex < renderedPieceCount; pieceIndex += 1) {
      const pieceY = usableY + pieceIndex * piecePitchMm
      if (pieceY >= usableY + usedLengthMm) break
      const pieceHeight = Math.min(pieceLengthMm, usableY + usedLengthMm - pieceY)
      if (pieceHeight <= 0) continue

      zones.push({
        id: `${stripId}-piece-${pieceIndex + 1}`,
        kind: 'piece',
        x: stripX,
        y: pieceY,
        width: stripWidth,
        height: pieceHeight,
        label: `P${pieceIndex + 1}`,
        detail: `${pieceWidthMm.toFixed(1)}x${pieceLengthMm.toFixed(1)}mm`,
        interactive: true,
      })
    }

    if (piecesPerStrip > renderedPieceCount) {
      const aggregateY = usableY + renderedPieceCount * piecePitchMm
      const aggregateHeight = Math.max(usableY + usedLengthMm - aggregateY, 0)
      if (aggregateHeight > 0) {
        zones.push({
          id: `${stripId}-piece-aggregate`,
          kind: 'aggregate',
          x: stripX,
          y: aggregateY,
          width: stripWidth,
          height: aggregateHeight,
          label: `+${piecesPerStrip - renderedPieceCount} pieces`,
          detail: 'Collapsed pieces',
          interactive: true,
        })
      }
    }
  }

  if (stripsPerRoll > renderedStripCount) {
    const remainingStrips = stripsPerRoll - renderedStripCount
    const aggregateX = usableX + renderedStripCount * stripPitchMm
    const aggregateWidth = Math.max(usableX + usableWidthMm - aggregateX, 0)
    if (aggregateWidth > 0) {
      zones.push({
        id: 'strip-aggregate',
        kind: 'aggregate',
        x: aggregateX,
        y: usableY,
        width: aggregateWidth,
        height: usedLengthMm,
        label: `+${remainingStrips} strips`,
        detail: 'Collapsed strips',
        interactive: true,
      })
    }
  }

  const usedWidthMm = Math.min(
    stripsPerRoll * pieceWidthMm + Math.max(stripsPerRoll - 1, 0) * knifeGapMm,
    usableWidthMm
  )

  const sideLossWidth = Math.max(usableWidthMm - usedWidthMm, 0)
  if (sideLossWidth > 0) {
    zones.push({
      id: 'loss-side-leftover',
      kind: 'loss',
      x: usableX + usedWidthMm,
      y: usableY,
      width: sideLossWidth,
      height: usedLengthMm,
      label: 'Loss: Side Leftover',
      detail: `${sideLossWidth.toFixed(1)}mm`,
    })
  }

  const tailLossHeight = Math.max(usableLengthMm - usedLengthMm, 0)
  if (tailLossHeight > 0) {
    zones.push({
      id: 'loss-tail-leftover',
      kind: 'loss',
      x: usableX,
      y: usableY + usedLengthMm,
      width: usableWidthMm,
      height: tailLossHeight,
      label: 'Loss: Tail Leftover',
      detail: `${tailLossHeight.toFixed(1)}mm`,
    })
  }

  return {
    widthMm: rollWidthMm,
    heightMm: rollLengthMm,
    zones,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: rollWidthMm,
      maxY: rollLengthMm,
    },
  }
}
