import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import {
  calculatePackagingPlan,
  type PackagingCalculationResult,
} from '@/features/logistics-config/packaging-calculator'
import {
  packagingRulesService,
} from '@/features/logistics-config/packaging-rules-service'
import { useActiveBOMWeightMap } from '@/features/product-structure/hooks/use-active-bom-weight-map'
import type { SalesOrder, SalesOrderLinePackagingSelection } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'
import {
  createPackagingProfileFromSelection,
  getPackagingProfilesForProduct,
  resolveSalesOrderLinePackagingSelection,
} from '../utils/sales-order-packaging-selection'

const PACKAGING_PROFILE_QUERY_KEY = ['logistics-config', 'packaging-profiles'] as const

export interface SalesOrderPackagingPreviewLine {
  key: string
  lineNo: number
  productId?: string
  productDisplayTitle: string
  productDisplaySubtitle: string
  qty: number
  uom: string
  selectedPackaging?: SalesOrderLinePackagingSelection
  matchedProfileCount: number
  productWeight: number
  plan: PackagingCalculationResult
}

export interface SalesOrderPackagingPreviewSummary {
  totalLineCount: number
  packagedLineCount: number
  unpackagedLineCount: number
  totalBoxCount: number
  totalVolume: number
  totalGrossWeight: number
  warnings: string[]
}

export interface SalesOrderPackagingPreviewData {
  lines: SalesOrderPackagingPreviewLine[]
  summary: SalesOrderPackagingPreviewSummary
}

function resolveLineDisplayTitle(line: SalesOrder['lines'][number]): string {
  return (
    line.productDisplayTitleSnapshot?.trim() ||
    line.productDisplayFullLabelSnapshot?.trim() ||
    '未识别产品'
  )
}

function resolveLineDisplaySubtitle(line: SalesOrder['lines'][number]): string {
  return line.productDisplaySubtitleSnapshot?.trim() || '--'
}

export function useSalesOrderPackagingPreview(order: SalesOrder) {
  const packagingProfilesQuery = useQuery({
    queryKey: PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
  })

  // 仍需把销售订单产品打包选项取回来——里面带的是产品身份（id/sku/name），
  // 与 BOM 重量解耦后这里只用作"该产品在产品主数据里存在"的存在性校验。
  const productsQuery = useQuery({
    queryKey: tradingQueryKeys.salesOrderPackagingProductOptions(),
    queryFn: () => ProductCoreService.getProductPackagingOptions(),
  })

  // 方案 B：产品最终重量唯一权威源是 BOM.measuredWeight。
  // 这里按订单行涉及的 productIds 批量拉当前 RELEASED BOM 的重量+单位。
  const productIds = useMemo(
    () => order.lines.map((line) => line.productId).filter((id): id is string => Boolean(id)),
    [order.lines]
  )
  const weightMap = useActiveBOMWeightMap(productIds)

  const data = useMemo<SalesOrderPackagingPreviewData | null>(() => {
    if (!packagingProfilesQuery.data || !productsQuery.data) return null

    const lines = order.lines.map<SalesOrderPackagingPreviewLine>((line) => {
      const matchedProfiles = getPackagingProfilesForProduct(
        packagingProfilesQuery.data,
        line.productId,
        true
      )
      const selectedPackaging = resolveSalesOrderLinePackagingSelection(
        line,
        packagingProfilesQuery.data
      )
      const warnings: string[] = []
      const productDisplayTitle = resolveLineDisplayTitle(line)
      const productDisplaySubtitle = resolveLineDisplaySubtitle(line)

      if (!line.productId) {
        warnings.push('Order line is missing product binding.')
      }

      if (line.productId && !selectedPackaging) {
        warnings.push(
          matchedProfiles.length > 0
            ? 'Packaging selection is pending for this order line.'
            : 'No packaging profiles matched this product.'
        )
      }

      // 从 BOM 权威源拿当前发布版本的重量；没有 RELEASED BOM 时降级 0 + 明确 warning。
      const weightInfo = line.productId ? weightMap.get(line.productId) : undefined
      const productWeight = weightInfo?.available ? weightInfo.weight : 0
      if (line.productId && !weightInfo?.available) {
        warnings.push(
          'Product has no released BOM yet; weight defaults to 0 until a BOM is released.'
        )
      }

      const plan = calculatePackagingPlan({
        orderedQuantity: line.qty,
        productWeight,
        profiles: (selectedPackaging ? [createPackagingProfileFromSelection(selectedPackaging)] : []).map((profile) => ({
          profileId: profile.id,
          profileName: profile.name,
          capacity: profile.capacity,
          netWeight: profile.netWeight,
          length: profile.length,
          width: profile.width,
          height: profile.height,
          dimensionUnitCode: profile.dimensionUnitCode,
          weightUnitCode: profile.weightUnitCode,
        })),
      })

      return {
        key: `${order.id}-${line.lineNo}`,
        lineNo: line.lineNo,
        productId: line.productId,
        productDisplayTitle,
        productDisplaySubtitle,
        qty: line.qty,
        uom: line.uom,
        selectedPackaging,
        matchedProfileCount: matchedProfiles.length,
        productWeight,
        plan: {
          ...plan,
          warnings: [...warnings, ...plan.warnings],
        },
      }
    })

    const warnings = lines.flatMap((line) => line.plan.warnings)
    const packagedLineCount = lines.filter((line) => line.plan.boxCount > 0).length

    return {
      lines,
      summary: {
        totalLineCount: lines.length,
        packagedLineCount,
        unpackagedLineCount: lines.length - packagedLineCount,
        totalBoxCount: lines.reduce((sum, line) => sum + line.plan.boxCount, 0),
        totalVolume: lines.reduce((sum, line) => sum + line.plan.totalVolume, 0),
        totalGrossWeight: lines.reduce((sum, line) => sum + line.plan.totalGrossWeight, 0),
        warnings,
      },
    }
  }, [order.id, order.lines, packagingProfilesQuery.data, productsQuery.data, weightMap])

  return {
    data,
    isLoading: packagingProfilesQuery.isLoading || productsQuery.isLoading,
    isError: packagingProfilesQuery.isError || productsQuery.isError,
    error: packagingProfilesQuery.error ?? productsQuery.error ?? null,
  }
}
