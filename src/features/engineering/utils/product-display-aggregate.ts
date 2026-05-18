import { type BOM } from '@/features/product-structure/data/schema'
import { resolveBOMOwnerDisplay } from '@/features/product-structure/utils/bom-owner-display'
import {
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductType,
} from '../data/schema'
import { type ProductDisplaySummaryItemV2 } from '../display/product-display-v2'
import { normalizeProductAttributeMachineValue } from './product-attribute-machine-value'
import {
  PRODUCT_ATTRIBUTE_CATEGORY_KEYS,
  getAttributeValue,
  getCategoryName,
  getOptionLabel,
} from './product-attribute-utils'
import { resolveEffectiveProductName } from './product-form-utils'

function normalizeTrimmedValue(value?: string | null): string {
  return value?.trim() ?? ''
}

export function formatBOMMeasuredWeight(
  bom?: Pick<BOM, 'measuredWeight' | 'measuredWeightUnit'> | null
): string {
  if (!bom) return ''
  const weight = typeof bom.measuredWeight === 'number' ? bom.measuredWeight : 0
  if (!Number.isFinite(weight) || weight <= 0) {
    return ''
  }
  const unit = normalizeTrimmedValue(bom.measuredWeightUnit) || 'g'
  return `${weight}${unit}`
}

export function resolveAttributeDisplayValue(params: {
  locale: string
  categoryKey: string
  rawValue: string
  options?: ProductAttributeOption[]
}): string {
  const rawValue = normalizeTrimmedValue(params.rawValue)
  if (!rawValue) {
    return ''
  }

  const normalizedCategoryKey = normalizeProductAttributeMachineValue(params.categoryKey)
  const normalizedRawValue = normalizeProductAttributeMachineValue(rawValue)
  const option = params.options?.find((item) => {
    if (normalizeProductAttributeMachineValue(item.categoryKey) !== normalizedCategoryKey) {
      return false
    }

    const optionValue = normalizeTrimmedValue(item.value)
    return optionValue === rawValue
      || normalizeProductAttributeMachineValue(optionValue) === normalizedRawValue
  })

  return getOptionLabel(params.locale, option) || rawValue
}

export interface ProductAggregateDisplayResult {
  label: string
  titleCoveredKeys: string[]
  supplementalItems: ProductDisplaySummaryItemV2[]
}

function resolveLocalizedLabel(locale: string, zh: string, en: string): string {
  return locale.startsWith('zh') ? zh : en
}

function resolveCategoryDisplayLabel(params: {
  locale: string
  categoryKey: string
  categories?: ProductAttributeCategory[]
  fallbackZh: string
  fallbackEn: string
}): string {
  const normalizedKey = normalizeProductAttributeMachineValue(params.categoryKey)
  const category = params.categories?.find(
    (item) => normalizeProductAttributeMachineValue(item.key) === normalizedKey
  )

  return getCategoryName(params.locale, category)
    || resolveLocalizedLabel(params.locale, params.fallbackZh, params.fallbackEn)
}

function buildSupplementalItem(params: {
  key: string
  label: string
  value: string
  emptyValue: string
}): ProductDisplaySummaryItemV2 {
  const normalizedValue = normalizeTrimmedValue(params.value)

  return {
    key: params.key,
    label: params.label,
    value: normalizedValue || params.emptyValue,
    empty: normalizedValue.length === 0,
  }
}

export function resolveProductAggregateDisplay(params: {
  locale: string
  product: Pick<Product, 'name' | 'typeId' | 'attributeValues'>
  productTypes: ProductType[]
  bom?: Pick<BOM, 'bomType' | 'ownerType' | 'ownerCustomerId' | 'versionLevel' | 'measuredWeight' | 'measuredWeightUnit'> | null
  categories?: ProductAttributeCategory[]
  options?: ProductAttributeOption[]
  customerNameMap?: Map<string, string>
  ownerTypeInternalLabel: string
  ownerTypeCustomerLabel?: string
  unknownCustomerLabel: string
  emptyBaseLabel?: string
  emptyValue?: string
}): ProductAggregateDisplayResult {
  const baseModelLabel =
    normalizeTrimmedValue(resolveEffectiveProductName({
      product: params.product,
      productTypes: params.productTypes,
    }))
    || normalizeTrimmedValue(params.product.name)
    || normalizeTrimmedValue(params.emptyBaseLabel)
    || 'UNNAMED'
  const emptyValue = normalizeTrimmedValue(params.emptyValue)
    || resolveLocalizedLabel(params.locale, '未绑定', 'Unbound')

  const ownerDisplay = params.bom
    ? resolveBOMOwnerDisplay(params.bom, {
        internalLabel: params.ownerTypeInternalLabel,
        unknownCustomerLabel: params.unknownCustomerLabel,
        customerNameMap: params.customerNameMap,
      })
    : null
  const ownerCustomerLabel = ownerDisplay?.ownerType === 'CUSTOMER'
    ? normalizeTrimmedValue(ownerDisplay.label)
    : ''
  const ownerTypeLabel = !params.bom
    ? ''
    : ownerDisplay?.ownerType === 'CUSTOMER'
      ? normalizeTrimmedValue(params.ownerTypeCustomerLabel)
        || resolveLocalizedLabel(params.locale, '客户', 'Customer')
      : params.ownerTypeInternalLabel
  const versionLabel = resolveAttributeDisplayValue({
    locale: params.locale,
    categoryKey: PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version,
    rawValue: normalizeTrimmedValue(params.bom?.versionLevel),
    options: params.options,
  })
  const measuredWeightLabel = formatBOMMeasuredWeight(params.bom)
  const brakeLabel = resolveAttributeDisplayValue({
    locale: params.locale,
    categoryKey: PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake,
    rawValue: getAttributeValue(params.product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake),
    options: params.options,
  })
  const titleCoveredKeys = [
    ownerCustomerLabel ? 'bom-owner-customer' : '',
    versionLabel ? normalizeProductAttributeMachineValue(PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version) : '',
    measuredWeightLabel ? 'bom-measured-weight' : '',
    brakeLabel ? normalizeProductAttributeMachineValue(PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake) : '',
  ].filter(Boolean)
  const aggregateSegments = [
    ownerCustomerLabel,
    versionLabel,
    measuredWeightLabel,
    brakeLabel,
  ].filter(Boolean)

  const supplementalItems = [
    buildSupplementalItem({
      key: 'bom-type',
      label: resolveLocalizedLabel(params.locale, 'BOM类型', 'BOM Type'),
      value: params.bom
        ? (normalizeTrimmedValue(params.bom.bomType) || 'EBOM')
        : '',
      emptyValue,
    }),
    buildSupplementalItem({
      key: 'bom-owner-type',
      label: resolveLocalizedLabel(params.locale, '归属', 'Owner'),
      value: ownerTypeLabel,
      emptyValue,
    }),
    buildSupplementalItem({
      key: 'bom-owner-customer',
      label: resolveLocalizedLabel(params.locale, '归属客户', 'Owner Customer'),
      value: ownerCustomerLabel,
      emptyValue,
    }),
    buildSupplementalItem({
      key: normalizeProductAttributeMachineValue(PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version),
      label: resolveCategoryDisplayLabel({
        locale: params.locale,
        categoryKey: PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version,
        categories: params.categories,
        fallbackZh: '产品档次',
        fallbackEn: 'Product Grade',
      }),
      value: versionLabel,
      emptyValue,
    }),
    buildSupplementalItem({
      key: 'bom-measured-weight',
      label: resolveLocalizedLabel(params.locale, '成品重量', 'Finished Weight'),
      value: measuredWeightLabel,
      emptyValue,
    }),
    buildSupplementalItem({
      key: normalizeProductAttributeMachineValue(PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake),
      label: resolveCategoryDisplayLabel({
        locale: params.locale,
        categoryKey: PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake,
        categories: params.categories,
        fallbackZh: '制动类型',
        fallbackEn: 'Brake Type',
      }),
      value: brakeLabel,
      emptyValue,
    }),
  ]

  return {
    label: aggregateSegments.length > 0
      ? `${baseModelLabel} (${aggregateSegments.join(' / ')})`
      : baseModelLabel,
    titleCoveredKeys,
    supplementalItems,
  }
}

export function resolveProductAggregateDisplayLabel(params: {
  locale: string
  product: Pick<Product, 'name' | 'typeId' | 'attributeValues'>
  productTypes: ProductType[]
  bom?: Pick<BOM, 'bomType' | 'ownerType' | 'ownerCustomerId' | 'versionLevel' | 'measuredWeight' | 'measuredWeightUnit'> | null
  categories?: ProductAttributeCategory[]
  options?: ProductAttributeOption[]
  customerNameMap?: Map<string, string>
  ownerTypeInternalLabel: string
  ownerTypeCustomerLabel?: string
  unknownCustomerLabel: string
  emptyBaseLabel?: string
  emptyValue?: string
}): string {
  return resolveProductAggregateDisplay(params).label
}
