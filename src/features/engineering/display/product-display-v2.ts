import {
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductTemplate,
} from '../data/schema'
import {
  getAttributeValue,
  getCategoryName,
  getOptionLabel,
} from '../utils/product-attribute-utils'
import { normalizeProductAttributeMachineValue } from '../utils/product-attribute-machine-value'

export const PRODUCT_DISPLAY_V2_STRATEGY_VERSION = 'product-display-v2' as const

export interface ProductDisplaySummaryItemV2 {
  key: string
  label: string
  value: string
  empty: boolean
}

export interface ProductDisplayProjectionV2 {
  title: string
  code: string
  summaryItems: ProductDisplaySummaryItemV2[]
  summaryText: string
  fullLabel: string
  strategyVersion: typeof PRODUCT_DISPLAY_V2_STRATEGY_VERSION
}

export interface ResolveProductDisplayV2Params {
  locale: string
  product: Pick<Product, 'name' | 'sku' | 'modelCode' | 'attributeValues'> | null | undefined
  template?: Pick<ProductTemplate, 'attributeBindings'> | null
  categories?: Array<Pick<ProductAttributeCategory, 'key' | 'nameZh' | 'nameEn'>>
  options?: Array<Pick<ProductAttributeOption, 'categoryKey' | 'value' | 'labelZh' | 'labelEn'>>
  emptyValue?: string
}

function normalizeDisplayValue(value?: string | null): string {
  return value?.trim() ?? ''
}

function resolveMatchedOption(
  normalizedCategoryKey: string,
  rawValue: string,
  options?: Array<Pick<ProductAttributeOption, 'categoryKey' | 'value' | 'labelZh' | 'labelEn'>>
) {
  const normalizedRawValue = normalizeProductAttributeMachineValue(rawValue)

  return options?.find((item) => {
    if (normalizeProductAttributeMachineValue(item.categoryKey) !== normalizedCategoryKey) {
      return false
    }

    const optionValue = normalizeDisplayValue(item.value)
    const labelZh = normalizeDisplayValue(item.labelZh)
    const labelEn = normalizeDisplayValue(item.labelEn)

    return optionValue === rawValue
      || (normalizedRawValue !== ''
        && normalizeProductAttributeMachineValue(optionValue) === normalizedRawValue)
      || labelZh === rawValue
      || labelEn === rawValue
      || (normalizedRawValue !== ''
        && labelEn !== ''
        && normalizeProductAttributeMachineValue(labelEn) === normalizedRawValue)
  })
}

function resolveDisplayTitle(
  product: Pick<Product, 'name' | 'sku' | 'modelCode'> | null | undefined
) {
  const code = normalizeDisplayValue(product?.sku) || normalizeDisplayValue(product?.modelCode)
  const title = normalizeDisplayValue(product?.name) || 'UNNAMED'

  return {
    code,
    title,
  }
}

export function resolveProductDisplaySummaryItemsV2(
  params: ResolveProductDisplayV2Params
): ProductDisplaySummaryItemV2[] {
  const product = params.product
  const bindings = [...(params.template?.attributeBindings ?? [])]
    .filter((binding) => binding.active !== false)
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))

  if (!product || bindings.length === 0) {
    return []
  }

  return bindings.map((binding) => {
    const normalizedCategoryKey = normalizeProductAttributeMachineValue(binding.categoryKey)
    const rawValue = getAttributeValue(product, binding.categoryKey).trim()
    const category = params.categories?.find(
      (item) => normalizeProductAttributeMachineValue(item.key) === normalizedCategoryKey
    )
    const option = rawValue
      ? resolveMatchedOption(normalizedCategoryKey, rawValue, params.options)
      : undefined

    return {
      key: normalizedCategoryKey || binding.categoryKey,
      label: getCategoryName(params.locale, category) || binding.categoryKey,
      value: rawValue ? getOptionLabel(params.locale, option) || rawValue : params.emptyValue ?? '-',
      empty: !rawValue,
    }
  })
}

export function resolveProductDisplayV2(
  params: ResolveProductDisplayV2Params
): ProductDisplayProjectionV2 {
  const { title, code } = resolveDisplayTitle(params.product)
  const summaryItems = resolveProductDisplaySummaryItemsV2(params)
  const summaryText = summaryItems
    .filter((item) => !item.empty)
    .map((item) => item.value)
    .join(' / ')

  return {
    title,
    code,
    summaryItems,
    summaryText,
    fullLabel: title,
    strategyVersion: PRODUCT_DISPLAY_V2_STRATEGY_VERSION,
  }
}
