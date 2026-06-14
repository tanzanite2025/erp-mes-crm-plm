import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import {
  packagingRulesService,
  type PackagingProfile,
} from '@/features/logistics-config/packaging-rules-service'
import {
  type ActiveBOMWeightInfo,
  type ActiveBOMWeightProbe,
  useActiveBOMWeightMap,
} from '@/features/product-structure/hooks/use-active-bom-weight-map'
import type { SalesOrder } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'

export const SALES_ORDER_PACKAGING_PROFILE_QUERY_KEY = [
  'logistics-config',
  'packaging-profiles',
] as const

export interface SalesOrderPackagingCardResources {
  profiles: PackagingProfile[]
  profilesReady: boolean
  productOptionsReady: boolean
  weightMap: Map<string, ActiveBOMWeightInfo>
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export function buildSalesOrderPackagingWeightProbes(
  orders: ReadonlyArray<SalesOrder>
): ActiveBOMWeightProbe[] {
  const seen = new Set<string>()
  const probes: ActiveBOMWeightProbe[] = []

  orders.forEach((order) => {
    order.lines.forEach((line) => {
      const productId = line.productId?.trim()
      if (!productId) {
        return
      }

      const customerId = order.customerId?.trim() || undefined
      const key = `${productId}::${customerId ?? ''}`
      if (seen.has(key)) {
        return
      }

      seen.add(key)
      probes.push({ productId, customerId })
    })
  })

  return probes.sort(
    (left, right) =>
      left.productId.localeCompare(right.productId) ||
      (left.customerId ?? '').localeCompare(right.customerId ?? '')
  )
}

export function useSalesOrderPackagingCardResources(
  orders: ReadonlyArray<SalesOrder>
): SalesOrderPackagingCardResources {
  const packagingProfilesQuery = useQuery({
    queryKey: SALES_ORDER_PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
  })

  const productsQuery = useQuery({
    queryKey: tradingQueryKeys.salesOrderPackagingProductOptions(),
    queryFn: () => ProductCoreService.getProductPackagingOptions(),
  })

  const probes = useMemo(
    () => buildSalesOrderPackagingWeightProbes(orders),
    [orders]
  )
  const weightMap = useActiveBOMWeightMap(probes)

  return {
    profiles: packagingProfilesQuery.data ?? [],
    profilesReady: Boolean(packagingProfilesQuery.data),
    productOptionsReady: Boolean(productsQuery.data),
    weightMap,
    isLoading: packagingProfilesQuery.isLoading || productsQuery.isLoading,
    isError: packagingProfilesQuery.isError || productsQuery.isError,
    error: packagingProfilesQuery.error ?? productsQuery.error ?? null,
  }
}
