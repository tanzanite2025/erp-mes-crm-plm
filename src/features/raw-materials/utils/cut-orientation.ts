export type CutOrientationGeometry = {
  angleDeg: number
  normalizedAngleDeg: number
  baseWidthMm: number
  baseLengthMm: number
  envelopeWidthMm: number
  envelopeLengthMm: number
  baseAreaM2: number
  envelopeAreaM2: number
}

export const SUPPORTED_CUT_ANGLE_VALUES = ['0', '45'] as const

export type SupportedCutAngleValue = (typeof SUPPORTED_CUT_ANGLE_VALUES)[number]

export const SUPPORTED_CUT_ANGLE_OPTIONS: ReadonlyArray<{
  value: SupportedCutAngleValue
  label: string
}> = [
  { value: '0', label: '0°' },
  { value: '45', label: '45°' },
] as const

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function toFinitePositiveNumber(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0
  }
  return value
}

export function toCutAngleDegrees(value: string | number | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  const parsed = Number.parseFloat(String(value || '').trim())
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeCutAngleDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  const normalized = ((value % 180) + 180) % 180
  return normalized === 180 ? 0 : normalized
}

export function resolveSupportedCutAngleValue(
  value: string | number | undefined
): SupportedCutAngleValue {
  const parsed = toCutAngleDegrees(value)
  if (parsed === 45) {
    return '45'
  }
  return '0'
}

export function formatSupportedCutAngleLabel(
  value: string | number | undefined
): string {
  const normalizedValue = resolveSupportedCutAngleValue(value)
  return `${normalizedValue}°`
}

export function resolveCutOrientationGeometry(params: {
  widthMm: number
  lengthMm: number
  cutAngleDeg: number
}): CutOrientationGeometry {
  const baseWidthMm = toFinitePositiveNumber(params.widthMm)
  const baseLengthMm = toFinitePositiveNumber(params.lengthMm)
  const normalizedAngleDeg = normalizeCutAngleDegrees(params.cutAngleDeg)

  if (!baseWidthMm || !baseLengthMm) {
    return {
      angleDeg: normalizedAngleDeg,
      normalizedAngleDeg,
      baseWidthMm,
      baseLengthMm,
      envelopeWidthMm: 0,
      envelopeLengthMm: 0,
      baseAreaM2: 0,
      envelopeAreaM2: 0,
    }
  }

  const radians = (normalizedAngleDeg * Math.PI) / 180
  const envelopeWidthMm =
    Math.abs(baseWidthMm * Math.cos(radians)) +
    Math.abs(baseLengthMm * Math.sin(radians))
  const envelopeLengthMm =
    Math.abs(baseWidthMm * Math.sin(radians)) +
    Math.abs(baseLengthMm * Math.cos(radians))
  const baseAreaM2 = (baseWidthMm * baseLengthMm) / 1_000_000
  const envelopeAreaM2 = (envelopeWidthMm * envelopeLengthMm) / 1_000_000

  return {
    angleDeg: normalizedAngleDeg,
    normalizedAngleDeg,
    baseWidthMm: round(baseWidthMm, 3),
    baseLengthMm: round(baseLengthMm, 3),
    envelopeWidthMm: round(envelopeWidthMm, 3),
    envelopeLengthMm: round(envelopeLengthMm, 3),
    baseAreaM2: round(baseAreaM2, 6),
    envelopeAreaM2: round(envelopeAreaM2, 6),
  }
}
