import { type SaveProductAttributeCategoryInput, type SaveProductAttributeOptionInput } from '../mutation-types'

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

export function normalizeProductAttributeCategoryInputKey(
  category: SaveProductAttributeCategoryInput
): SaveProductAttributeCategoryInput {
  return {
    ...category,
    key: normalizeProductAttributeMachineValue(category.key || ''),
  }
}

export function normalizeProductAttributeOptionInputValue(
  option: SaveProductAttributeOptionInput
): SaveProductAttributeOptionInput {
  return {
    ...option,
    categoryKey: normalizeProductAttributeMachineValue(option.categoryKey || ''),
    value: normalizeProductAttributeMachineValue(option.value || ''),
  }
}

export function buildProductAttributeCategorySaveInput(
  category: SaveProductAttributeCategoryInput
): SaveProductAttributeCategoryInput {
  const normalized = normalizeProductAttributeCategoryInputKey(category)
  return {
    ...normalized,
    nameZh: normalized.nameZh?.trim(),
    nameEn: normalized.nameEn?.trim(),
    description: normalized.description?.trim(),
  }
}

export function buildProductAttributeOptionSaveInput(
  option: SaveProductAttributeOptionInput
): SaveProductAttributeOptionInput {
  const normalized = normalizeProductAttributeOptionInputValue(option)
  return {
    ...normalized,
    labelZh: normalized.labelZh?.trim(),
    labelEn: normalized.labelEn?.trim(),
    description: normalized.description?.trim(),
  }
}

export function findProductAttributeOptionConflictInCategory<T extends { id?: string; categoryKey: string; value: string }>(
  items: T[],
  categoryKey: string,
  nextValue: string,
  currentId?: string
): T | undefined {
  const normalizedCategoryKey = normalizeProductAttributeMachineValue(categoryKey)
  return items.find((item) => {
    if (currentId && item.id === currentId) {
      return false
    }

    return (
      normalizeProductAttributeMachineValue(item.categoryKey) === normalizedCategoryKey &&
      areSameProductAttributeMachineValue(item.value, nextValue)
    )
  })
}
