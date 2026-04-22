import type { WeavingMode } from './weaving-mode-schema'

export function gcd(a: number, b: number): number {
  let left = Math.abs(a)
  let right = Math.abs(b)

  while (right !== 0) {
    const temp = right
    right = left % right
    left = temp
  }

  return left || 1
}

export function normalizeWeavingRatio(numerator: number, denominator: number) {
  const divisor = gcd(numerator, denominator)
  const normalizedNumerator = numerator / divisor
  const normalizedDenominator = denominator / divisor
  const normalizedRatioKey = `${normalizedNumerator}:${normalizedDenominator}`

  return {
    normalizedNumerator,
    normalizedDenominator,
    normalizedRatioKey,
    label: normalizedRatioKey,
    code: `ENGINEERING_MASTER_WEAVING_MODE_${normalizedNumerator}_${normalizedDenominator}`,
  }
}

export function sortWeavingModes(items: WeavingMode[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    if (left.ratioNumerator !== right.ratioNumerator) {
      return left.ratioNumerator - right.ratioNumerator
    }

    return left.ratioDenominator - right.ratioDenominator
  })
}
