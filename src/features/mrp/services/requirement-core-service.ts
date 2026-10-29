import { type AppLocale, translate } from '@/locales'
import { apiFetch } from '@/lib/api-client'
import type { ProductionMaterialRequirementBomSelection } from '@/features/production-material-requirements/contracts/production-material-requirement-source-bom-and-contribution-api-dto'
import {
  productionMaterialRequirementAnalysisResponseSchema,
  type ProductionMaterialRequirementAnalysisResponse,
} from '../contracts/production-material-requirement-analysis-api-dto'
import { type MaterialRequirement } from '../data/requirement-schema'

export const RequirementCoreService = {
  async getMrpRequirements(
    selectedKeys: string[] = [],
    bomSelections: ProductionMaterialRequirementBomSelection[] = []
  ): Promise<ProductionMaterialRequirementAnalysisResponse> {
    const params = new URLSearchParams()
    if (selectedKeys.length > 0) {
      params.set('selectedKeys', selectedKeys.join(','))
    }
    if (bomSelections.length > 0) {
      params.set('bomSelections', JSON.stringify(bomSelections))
    }

    const query = params.toString()
    const endpoint = query ? `/mrp/requirements?${query}` : '/mrp/requirements'
    const res = await apiFetch<unknown>(endpoint)
    return productionMaterialRequirementAnalysisResponseSchema.parse(res)
  },

  getUniqueProductsSummary(
    data: MaterialRequirement[],
    locale: AppLocale
  ): string {
    const separator = translate(locale, 'mrp.requirements.export.separator')
    const uniqueProducts = Array.from(
      new Set(
        data.flatMap((item) =>
          item.sourceOrders.map((order) => order.productName)
        )
      )
    )

    if (uniqueProducts.length > 3) {
      return `${uniqueProducts.slice(0, 3).join(separator)} ${translate(locale, 'mrp.requirements.export.productsMore', { count: uniqueProducts.length - 3 })}`
    }
    return uniqueProducts.join(separator)
  },

  formatPackaging(item: MaterialRequirement, locale: AppLocale): string {
    if (!item.packaging) return '-'

    const { packQty, packUnit, factor, direction } = item.packaging
    const formula =
      direction === 'reverse'
        ? translate(locale, 'mrp.requirements.export.packagingFormulaReverse', {
            unit: item.unit,
            factor,
            packUnit,
          })
        : translate(locale, 'mrp.requirements.export.packagingFormulaForward', {
            unit: item.unit,
            factor,
            packUnit,
          })

    return `${packQty} ${packUnit} (${formula})`
  },

  formatShortage(item: MaterialRequirement, locale: AppLocale): string {
    if (item.effectiveGap <= 0) {
      return translate(locale, 'mrp.requirements.export.shortageEnough')
    }

    if (item.packaging) {
      return translate(locale, 'mrp.requirements.export.shortageWithPack', {
        gap: item.effectiveGap.toFixed(1),
        unit: item.unit,
        packQty: item.packaging.packQty,
        packUnit: item.packaging.packUnit,
      })
    }

    return `${item.effectiveGap.toFixed(1)} ${item.unit}`
  },
}
