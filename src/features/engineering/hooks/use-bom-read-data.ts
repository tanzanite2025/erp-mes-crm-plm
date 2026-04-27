'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type MaterialOption } from '../../material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type BOM, type Product } from '../data/schema'
import { BOMS_QUERY_KEY, PRODUCTS_QUERY_KEY } from '../query-keys'
import { bomService } from '../services/bom-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMReadData')

export type BOMReadDataResource = CompositeReadResource<{
  data: BOM[]
  materials: MaterialOption[]
  products: Product[]
}>

export function useBOMReadData(): BOMReadDataResource {

  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
  })
  const productsQuery = useQuery({
    queryKey: PRODUCTS_QUERY_KEY,
    queryFn: () => ProductCoreService.getProducts(),
  })

  const resource = useMemo<BOMReadDataResource>(() => {
    const bomFailure = resolveQueryFailure({
      data: bomsQuery.data,
      error: bomsQuery.error,
      isPending: bomsQuery.isLoading,
      scope: 'useBOMReadData.boms',
      missingMessage: '[CRITICAL] BOM data is missing after load',
      failureMessage: '[CRITICAL] BOM query failed',
    })
    if (bomFailure) {
      return {
        status: 'error',
        error: bomFailure.error,
        scope: bomFailure.scope,
      }
    }

    const materialsFailure = resolveQueryFailure({
      data: materialsQuery.data,
      error: materialsQuery.error,
      isPending: materialsQuery.isLoading,
      scope: 'useBOMReadData.materials',
      missingMessage: '[CRITICAL] BOM materials are missing after load',
      failureMessage: '[CRITICAL] BOM materials query failed',
    })
    if (materialsFailure) {
      return {
        status: 'error',
        error: materialsFailure.error,
        scope: materialsFailure.scope,
      }
    }

    const productsFailure = resolveQueryFailure({
      data: productsQuery.data,
      error: productsQuery.error,
      isPending: productsQuery.isLoading,
      scope: 'useBOMReadData.products',
      missingMessage: '[CRITICAL] BOM products are missing after load',
      failureMessage: '[CRITICAL] BOM products query failed',
    })
    if (productsFailure) {
      return {
        status: 'error',
        error: productsFailure.error,
        scope: productsFailure.scope,
      }
    }

    if (bomsQuery.isLoading || materialsQuery.isLoading || productsQuery.isLoading) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: bomsQuery.data as BOM[],
      materials: materialsQuery.data as MaterialOption[],
      products: productsQuery.data as Product[],
    }
  }, [
    bomsQuery.data,
    bomsQuery.error,
    bomsQuery.isLoading,
    materialsQuery.data,
    materialsQuery.error,
    materialsQuery.isLoading,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isLoading,
  ])

  useEffect(() => {
    if (resource.status !== 'error') {
      return
    }

    logger.error(`BOM read resource failed: ${resource.scope}`, resource.error)
    failLoudly(resource.error, resource.scope)
  }, [resource])

  return resource
}
