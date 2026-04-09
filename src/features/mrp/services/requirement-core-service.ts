import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type AppLocale, translate } from '@/locales'
import { type MaterialRequirement, type MrpStats } from '../data/requirement-schema'

type MrpRequirementsResponse = {
  requirements: MaterialRequirement[]
  stats: MrpStats
}

export const RequirementCoreService = {
  async getMrpRequirements(selectedKeys: string[] = []): Promise<MrpRequirementsResponse> {
    const params = new URLSearchParams()
    if (selectedKeys.length > 0) {
      params.set('selectedKeys', selectedKeys.join(','))
    }

    const query = params.toString()
    const endpoint = query ? `/mrp/requirements?${query}` : '/mrp/requirements'
    const res = await apiFetch<MrpRequirementsResponse>(endpoint)
    return ensureObjectResponse<MrpRequirementsResponse & Record<string, unknown>>(
      res,
      'RequirementCoreService.getMrpRequirements'
    ) as MrpRequirementsResponse
  },

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

  formatPackaging(item: MaterialRequirement, locale: AppLocale): string {
    if (!item.packaging) return '-'

    const { packQty, packUnit, factor, direction } = item.packaging
    const formula =
      direction === 'reverse'
        ? translate(locale, 'trading.requirements.export.packagingFormulaReverse', {
            unit: item.unit,
            factor,
            packUnit,
          })
        : translate(locale, 'trading.requirements.export.packagingFormulaForward', {
            unit: item.unit,
            factor,
            packUnit,
          })

    return `${packQty} ${packUnit} (${formula})`
  },

  formatShortage(item: MaterialRequirement, locale: AppLocale): string {
    if (item.effectiveGap <= 0) {
      return translate(locale, 'trading.requirements.export.shortageEnough')
    }

    if (item.packaging) {
      return translate(locale, 'trading.requirements.export.shortageWithPack', {
        gap: item.effectiveGap.toFixed(1),
        unit: item.unit,
        packQty: item.packaging.packQty,
        packUnit: item.packaging.packUnit,
      })
    }

    return `${item.effectiveGap.toFixed(1)} ${item.unit}`
  },
}
