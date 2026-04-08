import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type MaterialRequirement, type MrpStats } from '../data/requirement-schema'
import { type AppLocale, translate } from '@/locales'

type MrpRequirementsResponse = {
  requirements: MaterialRequirement[]
  stats: MrpStats
}

/**
 * 需求核心服务 (RequirementCoreService)
 * 
 * 职责：
 * 1. 负责 MRP 需求数据的拉取与聚合。
 * 2. 提供跨 UI/导出的业务视图格式化逻辑。
 */
export const RequirementCoreService = {
  /**
   * 获取 MRP 需求列表
   */
  async getMrpRequirements(selectedKeys: string[] = []): Promise<MrpRequirementsResponse> {
    const params = new URLSearchParams()
    if (selectedKeys.length > 0) {
      params.set('selectedKeys', selectedKeys.join(','))
    }

    const query = params.toString()
    const endpoint = query ? `/mrp/requirements?${query}` : '/mrp/requirements'
    const res = await apiFetch<MrpRequirementsResponse>(endpoint)
    return ensureObjectResponse<MrpRequirementsResponse & Record<string, unknown>>(res, 'RequirementCoreService.getMrpRequirements') as MrpRequirementsResponse
  },

  /**
   * 格式化关联产品列表摘要
   */
  getUniqueProductsSummary(data: MaterialRequirement[], locale: AppLocale): string {
    const separator = translate(locale, 'trading.requirements.export.separator')
    const uniqueProducts = Array.from(
      new Set(data.flatMap((item) => item.sourceOrders.map((order) => order.productName)))
    )
    
    if (uniqueProducts.length > 3) {
      return `${uniqueProducts.slice(0, 3).join(separator)} ${translate(locale, 'trading.requirements.export.productsMore', { count: uniqueProducts.length - 3 })}`
    }
    return uniqueProducts.join(separator)
  },

  /**
   * 格式化包装描述公式
   */
  formatPackaging(item: MaterialRequirement, locale: AppLocale): string {
    if (!item.packaging) return '-'
    
    const { packQty, packUnit, factor, direction } = item.packaging
    const formula = direction === 'reverse'
        ? translate(locale, 'trading.requirements.export.packagingFormulaReverse', { unit: item.unit, factor, packUnit })
        : translate(locale, 'trading.requirements.export.packagingFormulaForward', { unit: item.unit, factor, packUnit })
    
    return `${packQty} ${packUnit} (${formula})`
  },

  /**
   * 格式化缺额/短缺描述
   */
  formatShortage(item: MaterialRequirement, locale: AppLocale): string {
    if (item.shortageGap <= 0) {
      return translate(locale, 'trading.requirements.export.shortageEnough')
    }

    if (item.packaging) {
      return translate(locale, 'trading.requirements.export.shortageWithPack', {
          gap: item.shortageGap.toFixed(1),
          unit: item.unit,
          packQty: item.packaging.packQty,
          packUnit: item.packaging.packUnit
      })
    }

    return `${item.shortageGap.toFixed(1)} ${item.unit}`
  }
}
