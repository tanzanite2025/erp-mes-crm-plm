/** Shared identity fields; neither symbol type nor label decorations belong here. */
export interface ProductCodeSegments {
  year: string
  month: string
  day: string
  model: string
  appearance: string
  holePrefix: string
  holes: string
  serial: string
}

export const PRODUCT_CODE_LENGTH = 15

function normalizeProductCodeSegments(
  input: ProductCodeSegments
): ProductCodeSegments {
  return {
    year: input.year.trim().toUpperCase(),
    month: input.month.trim().toUpperCase(),
    day: input.day.trim().toUpperCase(),
    model: input.model.trim().toUpperCase(),
    appearance: input.appearance.trim().toUpperCase(),
    holePrefix: input.holePrefix.trim().toUpperCase(),
    holes: input.holes.trim().toUpperCase(),
    serial: input.serial.trim().toUpperCase(),
  }
}

/** Allows placeholders such as **** for simulation; never reserves a real serial. */
export function assembleProductCodeForRulePreview(
  input: ProductCodeSegments
): string {
  const segments = normalizeProductCodeSegments(input)
  return `${segments.year}${segments.month}${segments.day}${segments.model}${segments.appearance}${segments.holePrefix}${segments.holes}${segments.serial}`
}

/** Validates supplied fields only. Real product identities are issued by the server. */
export function assembleCanonicalProductCode(
  input: ProductCodeSegments
): string {
  const segments = normalizeProductCodeSegments(input)
  const validators: Array<[keyof ProductCodeSegments, RegExp]> = [
    ['year', /^\d{2}$/],
    ['month', /^(?:[1-9]|0|N|D)$/],
    ['day', /^(?:0[1-9]|[12]\d|3[01])$/],
    ['model', /^\d{2}$/],
    ['appearance', /^\d$/],
    ['holePrefix', /^[RD]$/],
    ['holes', /^\d{2}$/],
    ['serial', /^\d{4}$/],
  ]

  for (const [field, pattern] of validators) {
    if (!pattern.test(segments[field])) {
      throw new Error(`Invalid linear barcode segment: ${field}`)
    }
  }

  return assembleProductCodeForRulePreview(segments)
}

export function formatProductCodeMonthSegment(date: Date): string {
  const month = date.getMonth() + 1
  if (month <= 9) return String(month)
  if (month === 10) return '0'
  if (month === 11) return 'N'
  return 'D'
}
