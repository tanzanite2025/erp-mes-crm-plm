import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { productOptionsQueryKey } from '@/features/engineering/query-keys'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import {
  calculatePackagingPlan,
  type PackagingCalculationResult,
} from '@/features/logistics-config/packaging-calculator'
import {
  packagingRulesService,
} from '@/features/logistics-config/packaging-rules-service'
import type { SalesOrder, SalesOrderLinePackagingSelection } from '../data/schema'
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

  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProductPackagingOptions(),
  })

  const data = useMemo<SalesOrderPackagingPreviewData | null>(() => {
    if (!packagingProfilesQuery.data || !productsQuery.data) return null

    const productMap = new Map(productsQuery.data.map((product) => [product.id, product]))

    const lines = order.lines.map<SalesOrderPackagingPreviewLine>((line) => {
      const product = line.productId ? productMap.get(line.productId) : undefined
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

      const plan = calculatePackagingPlan({
        orderedQuantity: line.qty,
        productWeight: product?.weight ?? 0,
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
        productWeight: product?.weight ?? 0,
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
  }, [order.id, order.lines, packagingProfilesQuery.data, productsQuery.data])

  return {
    data,
    isLoading: packagingProfilesQuery.isLoading || productsQuery.isLoading,
    isError: packagingProfilesQuery.isError || productsQuery.isError,
    error: packagingProfilesQuery.error ?? productsQuery.error ?? null,
  }
}
