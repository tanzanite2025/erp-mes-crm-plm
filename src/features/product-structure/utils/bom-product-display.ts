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
 * 方案 B + 思路 3 重构 (Step R7)：BOM 是产品重量和档次的端到端权威源。
 *
 * - weight 来源 BOM.measuredWeight + measuredWeightUnit
 * - versionLevel 来源 BOM.versionLevel(R7 后产品不再持有该字段)
 * - series/brake 仍为产品属性
 *
 * 调用方必须把当前展示行对应的 BOM 一并传入；如果没有 BOM,version 回退为 "std",
 * weight 回退为 "-"。
 */
export function resolveBOMProductDisplaySummary(
  product: Pick<Product, 'attributeValues'>,
  bom?: Pick<BOM, 'measuredWeight' | 'measuredWeightUnit' | 'versionLevel'>
): BOMProductDisplaySummary {
  return {
    version: (bom?.versionLevel || '').trim() || 'std',
    series: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.series) || 'normal',
    brake: getAttributeValue(product, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.brake) || 'UNKNOWN',
    weightLabel: bom && bom.measuredWeight && bom.measuredWeight > 0
      ? `${bom.measuredWeight}${(bom.measuredWeightUnit || 'g').trim() || 'g'}`
      : '-',
  }
}
