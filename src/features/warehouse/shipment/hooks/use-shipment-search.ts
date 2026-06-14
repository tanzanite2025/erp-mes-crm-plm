'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { type MasterDataSearchResult } from '../../inventory'
import { warehouseQueryKeys } from '../../query-keys'
import { WarehouseMasterDataService } from '../../services/warehouse-master-data-service'
import { type ShipmentUiFeedback } from './shipment-ui-feedback'

const logger = createLogger('useShipmentSearch')

export type ShipmentSearchResource =
  | { status: 'idle' }
  | ReadResource<MasterDataSearchResult[]>

export function useShipmentSearch(feedback: Pick<ShipmentUiFeedback, 'error'>) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim())
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const searchResultsQuery = useQuery({
    queryKey: warehouseQueryKeys.masterDataSearch(
      'SHIPMENT',
      debouncedSearchQuery
    ),
    queryFn: (): Promise<MasterDataSearchResult[]> =>
      WarehouseMasterDataService.searchSelectableItems({
        query: debouncedSearchQuery,
        scope: 'SHIPMENT',
      }),
    enabled: debouncedSearchQuery.length > 0,
  })

  const searchResource: ShipmentSearchResource = (() => {
    if (!debouncedSearchQuery) {
      return { status: 'idle' }
    }

    const failure = resolveQueryFailure({
      data: searchResultsQuery.data,
      error: searchResultsQuery.error,
      isPending: searchResultsQuery.isPending,
      scope: 'useShipmentSearch.results',
      missingMessage: '[CRITICAL] Shipment search results missing after load',
      failureMessage: '[CRITICAL] Shipment search query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (searchResultsQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: searchResultsQuery.data as MasterDataSearchResult[],
    }
  })()

  useEffect(() => {
    if (searchResource.status !== 'error') return
    logger.error(
      `Shipment search failed: ${searchResource.scope}`,
      searchResource.error
    )
    failLoudly(searchResource.error, searchResource.scope)
  }, [searchResource])

  useEffect(() => {
    if (searchResource.status !== 'ready') return
    if (searchResource.data.length > 0) return
    feedback.error(t('warehouse.shipment.toast.notFound'))
  }, [feedback, searchResource, t])

  return {
    searchQuery,
    setSearchQuery,
    searchResource,
    retrySearch: searchResultsQuery.refetch,
  }
}
