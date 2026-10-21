import {
  type SaveProductTemplateAttributeLevelOneCategoryInput,
  type SaveProductTemplateAttributeLevelTwoOptionInput,
} from '../mutation-types'

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

function generateProductAttributeRandomHexIdentifier(): string {
  const randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  return Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')
}

export function generateProductAttributeCategoryMachineKey(): string {
  return `category-${generateProductAttributeRandomHexIdentifier()}`
}

export function generateProductAttributeOptionMachineValue(): string {
  return `option-${generateProductAttributeRandomHexIdentifier()}`
}

export function areSameProductAttributeCategoryKey(
  left: string,
  right: string
): boolean {
  const normalizedLeft = normalizeProductAttributeMachineValue(left)
  const normalizedRight = normalizeProductAttributeMachineValue(right)
  if (!normalizedLeft || !normalizedRight) {
    return false
  }
  return normalizedLeft === normalizedRight
}

function trimProductAttributeOptionalString(
  value: string | undefined
): string | undefined {
  return value?.trim()
}

export function normalizeProductAttributeCategoryInputKey(
  input: SaveProductTemplateAttributeLevelOneCategoryInput
): SaveProductTemplateAttributeLevelOneCategoryInput {
  return {
    ...input,
    key: input.id
      ? input.key
      : normalizeProductAttributeMachineValue(input.key || ''),
  }
}

export function normalizeProductAttributeOptionInputValue(
  input: SaveProductTemplateAttributeLevelTwoOptionInput
): SaveProductTemplateAttributeLevelTwoOptionInput {
  return {
    ...input,
    value: input.id
      ? input.value
      : normalizeProductAttributeMachineValue(input.value || ''),
  }
}

export function buildProductAttributeCategorySaveInput(
  input: SaveProductTemplateAttributeLevelOneCategoryInput
): SaveProductTemplateAttributeLevelOneCategoryInput {
  return {
    ...normalizeProductAttributeCategoryInputKey(input),
    nameZh: input.nameZh?.trim() || '',
    nameEn: trimProductAttributeOptionalString(input.nameEn),
    description: trimProductAttributeOptionalString(input.description),
    revisionNo: trimProductAttributeOptionalString(input.revisionNo),
    changeOrderNo: trimProductAttributeOptionalString(input.changeOrderNo),
    siteCode: trimProductAttributeOptionalString(input.siteCode),
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    active: input.active ?? true,
  }
}

export function buildProductAttributeOptionSaveInput(
  input: SaveProductTemplateAttributeLevelTwoOptionInput
): SaveProductTemplateAttributeLevelTwoOptionInput {
  return {
    ...normalizeProductAttributeOptionInputValue(input),
    categoryKey: input.categoryKey?.trim() || '',
    labelZh: input.labelZh?.trim() || '',
    labelEn: trimProductAttributeOptionalString(input.labelEn),
    description: trimProductAttributeOptionalString(input.description),
    revisionNo: trimProductAttributeOptionalString(input.revisionNo),
    changeOrderNo: trimProductAttributeOptionalString(input.changeOrderNo),
    siteCode: trimProductAttributeOptionalString(input.siteCode),
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    active: input.active ?? true,
  }
}

export function resolveProductAttributeCategoryKey<T extends { key: string }>(
  categories: T[],
  nextKey: string
): string {
  const trimmedKey = nextKey.trim()
  if (!trimmedKey) return ''

  const exactMatch = categories.find((item) => item.key === trimmedKey)
  if (exactMatch) {
    return exactMatch.key
  }

  const normalizedKey = normalizeProductAttributeMachineValue(trimmedKey)
  const compatibleMatch = categories.find(
    (item) => normalizeProductAttributeMachineValue(item.key) === normalizedKey
  )
  return compatibleMatch?.key ?? trimmedKey
}

export function getProductAttributeMachineValueFormatHint(
  locale: string
): string {
  if (locale === 'zh-CN') {
    return '机器值仅允许小写字母、数字与连字符，例如 matte-black'
  }
  return 'Machine values only allow lowercase letters, numbers, and hyphens, e.g. matte-black'
}
