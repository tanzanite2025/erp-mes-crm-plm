'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type MaterialOption } from '../../material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type Product } from '../data/schema'
import { productOptionsQueryKey } from '../query-keys'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMReferenceResource')

export type BOMReferenceResource = CompositeReadResource<{
  products: Product[]
  materials: MaterialOption[]
}>

interface UseBOMReferenceResourceParams {
  enabled?: boolean
}

export function useBOMReferenceResource({ enabled = true }: UseBOMReferenceResourceParams = {}): BOMReferenceResource {
  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
    enabled,
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
    enabled,
  })

  const resource = useMemo<BOMReferenceResource>(() => {
    const productsFailure = resolveQueryFailure({
      data: productsQuery.data,
      error: productsQuery.error,
      isPending: productsQuery.isPending,
      scope: 'useBOMReferenceResource.products',
      missingMessage: '[CRITICAL] Missing BOM reference products query data',
      failureMessage: '[CRITICAL] BOM reference products query failed',
    })
    if (productsFailure) {
      return {
        status: 'error',
        error: productsFailure.error,
        scope: productsFailure.scope,
      }
    }

    const materialsFailure = resolveQueryFailure({
      data: materialsQuery.data,
      error: materialsQuery.error,
      isPending: materialsQuery.isPending,
      scope: 'useBOMReferenceResource.materials',
      missingMessage: '[CRITICAL] Missing BOM reference materials query data',
      failureMessage: '[CRITICAL] BOM reference materials query failed',
    })
    if (materialsFailure) {
      return {
        status: 'error',
        error: materialsFailure.error,
        scope: materialsFailure.scope,
      }
    }

    if (productsQuery.isPending || materialsQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      products: productsQuery.data as Product[],
      materials: materialsQuery.data as MaterialOption[],
    }
  }, [
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

    logger.error(`BOM reference resource failed: ${resource.scope}`, resource.error)
    failLoudly(resource.error, resource.scope)
  }, [resource])

  return resource
}
