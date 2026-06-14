import {
  type SaveProductAttributeCategoryInput,
  type SaveProductAttributeOptionInput,
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

function trimOptionalString(value: string | undefined): string | undefined {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : undefined
}

export function normalizeProductAttributeCategoryInputKey(
  input: SaveProductAttributeCategoryInput
): SaveProductAttributeCategoryInput {
  return {
    ...input,
    key: normalizeProductAttributeMachineValue(input.key || ''),
  }
}

export function normalizeProductAttributeOptionInputValue(
  input: SaveProductAttributeOptionInput
): SaveProductAttributeOptionInput {
  return {
    ...input,
    value: normalizeProductAttributeMachineValue(input.value || ''),
  }
}

export function buildProductAttributeCategorySaveInput(
  input: SaveProductAttributeCategoryInput
): SaveProductAttributeCategoryInput {
  return {
    ...normalizeProductAttributeCategoryInputKey(input),
    nameZh: input.nameZh?.trim() || '',
    nameEn: trimOptionalString(input.nameEn),
    description: trimOptionalString(input.description),
    revisionNo: trimOptionalString(input.revisionNo),
    effectiveFrom: input.effectiveFrom ?? undefined,
    effectiveTo: input.effectiveTo ?? undefined,
    changeOrderNo: trimOptionalString(input.changeOrderNo),
    siteCode: trimOptionalString(input.siteCode),
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    active: input.active ?? true,
  }
}

export function buildProductAttributeOptionSaveInput(
  input: SaveProductAttributeOptionInput
): SaveProductAttributeOptionInput {
  return {
    ...normalizeProductAttributeOptionInputValue(input),
    categoryKey: input.categoryKey?.trim() || '',
    labelZh: input.labelZh?.trim() || '',
    labelEn: trimOptionalString(input.labelEn),
    description: trimOptionalString(input.description),
    revisionNo: trimOptionalString(input.revisionNo),
    effectiveFrom: input.effectiveFrom ?? undefined,
    effectiveTo: input.effectiveTo ?? undefined,
    changeOrderNo: trimOptionalString(input.changeOrderNo),
    siteCode: trimOptionalString(input.siteCode),
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
