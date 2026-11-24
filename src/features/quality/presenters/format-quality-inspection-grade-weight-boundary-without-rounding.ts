function parseInspectionWeightNumberAsDecimalCoefficientAndScale(
  value: number
) {
  const [mantissa, exponent = '0'] = String(value).split('e')
  const [integer, fraction = ''] = mantissa.split('.')
  return {
    coefficient: BigInt(`${integer}${fraction}`),
    scale: fraction.length - Number(exponent),
  }
}

// Display the same decimal bounds used by server grading without rounding away
// configured precision or exposing binary floating-point addition artifacts.
export function formatQualityInspectionGradeWeightBoundaryWithoutRounding(
  centerValue: number,
  allowedDeviation: number,
  boundary: 'lower' | 'upper'
): string {
  const center =
    parseInspectionWeightNumberAsDecimalCoefficientAndScale(centerValue)
  const deviation =
    parseInspectionWeightNumberAsDecimalCoefficientAndScale(allowedDeviation)
  const scale = Math.max(center.scale, deviation.scale, 0)
  const scaledCenter = center.coefficient * 10n ** BigInt(scale - center.scale)
  const scaledDeviation =
    deviation.coefficient * 10n ** BigInt(scale - deviation.scale)
  const scaledBoundary =
    boundary === 'lower'
      ? scaledCenter - scaledDeviation
      : scaledCenter + scaledDeviation
  const sign = scaledBoundary < 0n ? '-' : ''
  const digits = String(
    scaledBoundary < 0n ? -scaledBoundary : scaledBoundary
  ).padStart(scale + 1, '0')
  const integer = digits.slice(0, digits.length - scale)
  const fraction = scale > 0 ? digits.slice(-scale).replace(/0+$/, '') : ''
  return `${sign}${integer}${fraction ? `.${fraction}` : ''}`
}
