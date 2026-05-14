'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type MaterialOption } from '../../material-archive/data/schema'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM, type Product } from '../data/schema'
import { BOMS_QUERY_KEY } from '../query-keys'
import { bomService } from '../services/bom-service'
import { ALL_BOM_REFERENCES, useBOMReferenceResource } from './use-bom-reference-resource'

const logger = createLogger('useBOMReadData')

export type BOMReadDataResource = CompositeReadResource<{
  data: BOM[]
  materials: MaterialOption[]
  products: Product[]
  productDisplayLabelMap: Map<string, string>
  sections: BOMSectionOption[]
}>

export function useBOMReadData(filters?: { productId?: string; status?: string; bomType?: string }): BOMReadDataResource {
  const bomsQuery = useQuery({
    queryKey: filters ? [...BOMS_QUERY_KEY, filters] : BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(filters),
  })
  const referenceResource = useBOMReferenceResource({ include: ALL_BOM_REFERENCES })

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

    if (referenceResource.status === 'error') {
      return referenceResource
    }

    if (bomsQuery.isLoading || referenceResource.status === 'loading') {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: bomsQuery.data as BOM[],
      materials: referenceResource.materials,
      products: referenceResource.products,
      productDisplayLabelMap: referenceResource.productDisplayLabelMap,
      sections: referenceResource.sections,
    }
  }, [bomsQuery.data, bomsQuery.error, bomsQuery.isLoading, referenceResource])

  useEffect(() => {
    if (resource.status !== 'error' || resource.scope !== 'useBOMReadData.boms') {
      return
    }

    logger.error(`BOM read resource failed: ${resource.scope}`, resource.error)
    failLoudly(resource.error, resource.scope)
  }, [resource])

  return resource
}
