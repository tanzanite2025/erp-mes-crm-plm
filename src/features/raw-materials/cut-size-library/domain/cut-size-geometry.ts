import {
  resolveCutOrientationGeometry,
  resolveSupportedCutAngleValue,
  toCutAngleDegrees,
} from '../../utils/cut-orientation'

export type CutSizeGeometrySource = {
  id?: string
  code?: string
  name?: string
  widthMm?: string
  lengthMm?: string
  pieceCount?: string
  areaM2?: string
  areaWeightGsm?: string
  weightG?: string
  cutAngle?: string | number
  layupCount?: string
}

export type CutSizeDisplaySnapshot = {
  code: string
  name: string
  sizeExpression: string
}

export type CutSizeGeometryProjection = {
  cutSizeUnitId: string
  widthMm: number
  lengthMm: number
  pieceCountPerSet: number
  layupCount: number
  cutAngleDeg: number
  baseAreaM2: number
  envelopeWidthMm: number
  envelopeLengthMm: number
  envelopeAreaM2: number
}

export type ResolvedCutSizeGeometryProjection = {
  geometry: CutSizeGeometryProjection
  display: CutSizeDisplaySnapshot
}

export function toPositiveNumber(value?: string): number {
  const parsed = Number.parseFloat((value || '').trim())
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return parsed
}

function normalizeDecimalString(value: number, fractionDigits = 6): string {
  if (!Number.isFinite(value) || value <= 0) return ''
  return value.toFixed(fractionDigits).replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, '').replace(/\.$/, '')
}

export function formatCutSizeExpression(
  unit: Pick<CutSizeGeometrySource, 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  const width = unit.widthMm?.trim() || ''
  const length = unit.lengthMm?.trim() || ''
  const count = unit.pieceCount?.trim() || '1'
  if (!width || !length) return ''
  return `${width}x${length}x${count}`
}

export function deriveCutSizeAreaM2(
  unit: Pick<CutSizeGeometrySource, 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  const widthMm = toPositiveNumber(unit.widthMm)
  const lengthMm = toPositiveNumber(unit.lengthMm)
  const pieceCount = toPositiveNumber(unit.pieceCount || '1')
  if (!widthMm || !lengthMm || !pieceCount) return ''

  const areaM2 = (widthMm * lengthMm * pieceCount) / 1_000_000
  return normalizeDecimalString(areaM2)
}

export function resolveCutSizeAreaM2(
  unit: Pick<CutSizeGeometrySource, 'areaM2' | 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  return deriveCutSizeAreaM2(unit) || unit.areaM2?.trim() || ''
}

export function deriveCutSizeWeightG(
  unit: Pick<CutSizeGeometrySource, 'widthMm' | 'lengthMm' | 'pieceCount' | 'areaM2' | 'areaWeightGsm'>
): string {
  const areaM2 = toPositiveNumber(unit.areaM2) || toPositiveNumber(deriveCutSizeAreaM2(unit))
  const areaWeightGsm = toPositiveNumber(unit.areaWeightGsm)
  if (!areaM2 || !areaWeightGsm) return ''

  const weightG = areaM2 * areaWeightGsm
  return normalizeDecimalString(weightG, 3)
}

export function resolveCutSizeWeightG(
  unit: Pick<CutSizeGeometrySource, 'weightG' | 'areaM2' | 'areaWeightGsm' | 'widthMm' | 'lengthMm' | 'pieceCount'>
): string {
  return deriveCutSizeWeightG(unit) || unit.weightG?.trim() || ''
}

export function resolveCutSizeGeometryProjection(
  unit: CutSizeGeometrySource
): ResolvedCutSizeGeometryProjection {
  const widthMm = toPositiveNumber(unit.widthMm)
  const lengthMm = toPositiveNumber(unit.lengthMm)
  const pieceCountPerSet = Math.max(1, Math.floor(toPositiveNumber(unit.pieceCount || '1') || 1))
  const layupCount = Math.max(1, Math.floor(toPositiveNumber(unit.layupCount || '1') || 1))
  const cutAngleValue = resolveSupportedCutAngleValue(unit.cutAngle)
  const cutAngleDeg = toCutAngleDegrees(cutAngleValue)
  const orientationGeometry = resolveCutOrientationGeometry({
    widthMm,
    lengthMm,
    cutAngleDeg,
  })

  return {
    geometry: {
      cutSizeUnitId: String(unit.id || '').trim(),
      widthMm: orientationGeometry.baseWidthMm,
      lengthMm: orientationGeometry.baseLengthMm,
      pieceCountPerSet,
      layupCount,
      cutAngleDeg: orientationGeometry.angleDeg,
      baseAreaM2: orientationGeometry.baseAreaM2,
      envelopeWidthMm: orientationGeometry.envelopeWidthMm,
      envelopeLengthMm: orientationGeometry.envelopeLengthMm,
      envelopeAreaM2: orientationGeometry.envelopeAreaM2,
    },
    display: {
      code: String(unit.code || '').trim(),
      name: String(unit.name || '').trim(),
      sizeExpression: formatCutSizeExpression(unit),
    },
  }
}
