import {
  type Product,
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../data/schema'
import { areSameProductAttributeCategoryKey } from './product-attribute-machine-value'

export const PRODUCT_ATTRIBUTE_CATEGORY_KEYS = {
  series: 'techSeries',
  tireType: 'tireType',
  brake: 'brakeType',
  version: 'versionLevel',
} as const

// Product grade is owned by BOM; retain it only in BOM-derived display previews.
export function filterProductSpecificationOwnedAttributeValues<
  T extends { categoryKey: string },
>(items: readonly T[]): T[] {
  return items.filter(
    (item) =>
      !areSameProductAttributeCategoryKey(
        item.categoryKey,
        PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version
      )
  )
}

export function getAttributeValue(
  product: Pick<Product, 'attributeValues'> | undefined,
  categoryKey: string
): string {
  if (!product?.attributeValues?.length) return ''
  return (
    product.attributeValues.find((item) =>
      areSameProductAttributeCategoryKey(item.categoryKey, categoryKey)
    )?.optionValue || ''
  )
}

export function upsertAttributeValue(
  product: Product,
  categoryKey: string,
  optionValue: string
): Product {
  const nextValues = [...(product.attributeValues || [])]
  const index = nextValues.findIndex((item) =>
    areSameProductAttributeCategoryKey(item.categoryKey, categoryKey)
  )

  if (!optionValue) {
    if (index >= 0) nextValues.splice(index, 1)
    return { ...product, attributeValues: nextValues }
  }

  if (index >= 0) {
    nextValues[index] = {
      ...nextValues[index],
      categoryKey,
      optionValue,
      sortOrder: nextValues[index].sortOrder || index + 1,
    }
  } else {
    nextValues.push({
      categoryKey,
      optionValue,
      sortOrder: nextValues.length + 1,
      version: 1,
    })
  }

  return { ...product, attributeValues: nextValues }
}

export function getProductTemplateAttributeLevelOneCategoryName(
  locale: string,
  category:
    | Pick<
        ProductTemplateAttributeLevelOneCategory,
        'nameZh' | 'nameEn' | 'key'
      >
    | undefined
): string {
  if (!category) return ''
  if (locale === 'en-US')
    return category.nameEn?.trim() || category.nameZh || category.key
  return category.nameZh || category.nameEn || category.key
}

export function getProductTemplateAttributeLevelTwoOptionLabel(
  locale: string,
  option:
    | Pick<
        ProductTemplateAttributeLevelTwoOption,
        'labelZh' | 'labelEn' | 'value'
      >
    | undefined
): string {
  if (!option) return ''
  if (locale === 'en-US')
    return option.labelEn?.trim() || option.labelZh || option.value
  return option.labelZh || option.labelEn || option.value
}
