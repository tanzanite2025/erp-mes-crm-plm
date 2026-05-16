import {
  PRODUCT_ATTRIBUTE_CATEGORY_KEYS,
  getAttributeValue,
} from '@/features/engineering/utils/product-attribute-utils'
import { type BOM, type Product } from '../data/schema'

export interface BOMProductDisplaySummary {
  version: string
  series: string
  brake: string
  weightLabel: string
}

/**
 * 方案 B：BOM 是产品重量的端到端权威源。
 *
 * 历史上 weight 写在 Product 上，BOM 列表/预览/Sidebar 直接读 product.weight。
 * 现在 weight 唯一来源是 BOM.measuredWeight + measuredWeightUnit，因此调用方
 * 必须把当前展示行对应的 BOM 一并传入；如果上下文里没有 BOM（例如还未关联
 * BOM 的产品概览），传 undefined，重量回退为 "-"。
 */
export function resolveBOMProductDisplaySummary(
  product: Pick<Product, 'attributeValues'>,
  bom?: Pick<BOM, 'measuredWeight' | 'measuredWeightUnit'>
): BOMProductDisplaySummary {
  return {
    version: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version) || 'std',
    series: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.series) || 'normal',
    brake: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake) || 'UNKNOWN',
    weightLabel: bom && bom.measuredWeight && bom.measuredWeight > 0
      ? `${bom.measuredWeight}${(bom.measuredWeightUnit || 'g').trim() || 'g'}`
      : '-',
  }
}
