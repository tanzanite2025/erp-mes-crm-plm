export interface ProductCodeLabelReadableTextOptions {
  isDrainHole: boolean
  wheelType: string
  scopeCode: string
}

/** Label decorations affect human-readable text only, never either symbol's payload. */
export function formatProductCodeLabelReadableText(
  code: string,
  options: ProductCodeLabelReadableTextOptions
): string {
  const prefix = options.isDrainHole ? 'H' : ''
  const suffixParts: string[] = []
  if (options.wheelType) suffixParts.push(options.wheelType)
  if (options.scopeCode)
    suffixParts.push(options.scopeCode.trim().toUpperCase())
  const suffixText = suffixParts.join('-')
  const suffix = suffixText ? ` ${suffixText}` : ''
  return `${prefix}${code}${suffix}`
}
