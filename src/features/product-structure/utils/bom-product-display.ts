import {
  PRODUCT_ATTRIBUTE_CATEGORY_KEYS,
  getAttributeValue,
} from '@/features/engineering/utils/product-attribute-utils'
import { type Product } from '../data/schema'

export interface BOMProductDisplaySummary {
  version: string
  series: string
  brake: string
  weightLabel: string
}

export function resolveBOMProductDisplaySummary(
  product: Pick<Product, 'attributeValues' | 'weight'>
): BOMProductDisplaySummary {
  return {
    version: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version) || 'std',
    series: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.series) || 'normal',
    brake: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake) || 'UNKNOWN',
    weightLabel: product.weight ? `${product.weight}g` : '-',
  }
}
