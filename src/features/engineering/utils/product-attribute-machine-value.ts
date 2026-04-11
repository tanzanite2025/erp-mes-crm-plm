export function normalizeProductAttributeMachineValue(value: string): string {
  return value
    .trim()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function isValidProductAttributeMachineValue(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
}

export function areSameProductAttributeMachineValue(a: string, b: string): boolean {
  return normalizeProductAttributeMachineValue(a) === normalizeProductAttributeMachineValue(b)
}

export function getProductAttributeMachineValueFormatHint(locale: string): string {
  return locale === 'zh-CN'
    ? '机器值仅允许小写字母、数字与连字符，例如 matte-black'
    : 'Machine values only allow lowercase letters, numbers, and hyphens, e.g. matte-black'
}

export function findProductAttributeMachineValueConflict<T extends { id?: string }>(
  items: T[],
  nextValue: string,
  getValue: (item: T) => string,
  currentId?: string
): T | undefined {
  const normalizedNext = normalizeProductAttributeMachineValue(nextValue)
  if (!normalizedNext) return undefined

  return items.find((item) => {
    if (currentId && item.id === currentId) {
      return false
    }
    return areSameProductAttributeMachineValue(getValue(item), normalizedNext)
  })
}
