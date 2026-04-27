import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { type MaterialOption } from '../../material-archive/data/schema'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type ChangeOrder, type Product } from '../data/schema'
import { CHANGE_ORDERS_QUERY_KEY, productOptionsQueryKey } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMFormOptions')

interface UseBOMFormOptionsParams {
  open: boolean
  selectedProductId?: string
}

export type BOMFormOptionsResource = CompositeReadResource<{
  products: Product[]
  materials: MaterialOption[]
  changeOrders: ChangeOrder[]
}>

export function useBOMFormOptions({ open, selectedProductId }: UseBOMFormOptionsParams): BOMFormOptionsResource {
  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
    enabled: open,
  })
  const changeOrdersQuery = useQuery({
    queryKey: [...CHANGE_ORDERS_QUERY_KEY, selectedProductId || 'all', 'options'],
    queryFn: () =>
      changeOrderService.getChangeOrders({
        isOptions: true,
        productId: selectedProductId || undefined,
      }),
    enabled: open,
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
    enabled: open,
  })

  const resource = useMemo<BOMFormOptionsResource>(() => {
    const productsFailure = resolveQueryFailure({
      data: productsQuery.data,
      error: productsQuery.error,
      isPending: productsQuery.isPending,
      scope: 'useBOMFormOptions.products',
      missingMessage: '[CRITICAL] Missing BOM form products query data',
      failureMessage: '[CRITICAL] BOM form products query failed',
    })
    if (productsFailure) {
      return {
        status: 'error',
        error: productsFailure.error,
        scope: productsFailure.scope,
      }
    }

    const changeOrdersFailure = resolveQueryFailure({
      data: changeOrdersQuery.data,
      error: changeOrdersQuery.error,
      isPending: changeOrdersQuery.isPending,
      scope: 'useBOMFormOptions.changeOrders',
      missingMessage: '[CRITICAL] Missing BOM form change orders query data',
      failureMessage: '[CRITICAL] BOM form change orders query failed',
    })
    if (changeOrdersFailure) {
      return {
        status: 'error',
        error: changeOrdersFailure.error,
        scope: changeOrdersFailure.scope,
      }
    }

    const materialsFailure = resolveQueryFailure({
      data: materialsQuery.data,
      error: materialsQuery.error,
      isPending: materialsQuery.isPending,
      scope: 'useBOMFormOptions.materials',
      missingMessage: '[CRITICAL] Missing BOM form materials query data',
      failureMessage: '[CRITICAL] BOM form materials query failed',
    })
    if (materialsFailure) {
      return {
        status: 'error',
        error: materialsFailure.error,
        scope: materialsFailure.scope,
      }
    }

    if (productsQuery.isPending || changeOrdersQuery.isPending || materialsQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      products: productsQuery.data as Product[],
      changeOrders: changeOrdersQuery.data as ChangeOrder[],
      materials: materialsQuery.data as MaterialOption[],
    }
  }, [
    changeOrdersQuery.data,
    changeOrdersQuery.error,
    changeOrdersQuery.isPending,
    materialsQuery.data,
    materialsQuery.error,
    materialsQuery.isPending,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isPending,
  ])

  useEffect(() => {
    if (resource.status !== 'error') {
      return
    }

    logger.error(`BOM form options resource failed: ${resource.scope}`, resource.error)
    failLoudly(resource.error, resource.scope)
  }, [resource])

  return resource
}
