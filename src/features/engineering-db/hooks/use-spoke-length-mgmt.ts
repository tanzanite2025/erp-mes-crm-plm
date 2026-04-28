import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import type { DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type SpokeLength, type SpokeLengthInput } from '../data/schema'
import { type Hub } from '../data/hub-schema'
import { type Nipple } from '../data/nipple-schema'
import { SpokeService } from '../services/spoke-service'
import { hubService } from '../services/hub-service'
import { nippleService } from '../services/nipple-service'
import {
  ENGINEERING_DB_HUBS_QUERY_KEY,
  ENGINEERING_DB_NIPPLES_QUERY_KEY,
  ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY,
} from '../query-keys'
import { useEngineeringDbProductLookup } from './use-engineering-db-product-lookup'

export type SpokeLengthRowViewModel = {
  item: SpokeLength
  productSku: string | null
  productName: string | null
  hubName: string | null
  nippleName: string | null
  searchText: string
}

type SpokeLengthReadResource = CompositeReadResource<{
  data: SpokeLength[]
  filteredData: SpokeLengthRowViewModel[]
}>

const logger = createLogger('useSpokeLengthMgmt')

export function useSpokeLengthMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { productMap } = useEngineeringDbProductLookup()
  const [searchTerm, setSearchTerm] = useState('')

  const spokeLengthsQuery = useQuery({
    queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY,
    queryFn: () => SpokeService.getSpokeLength(),
  })

  const hubsQuery = useQuery({
    queryKey: ENGINEERING_DB_HUBS_QUERY_KEY,
    queryFn: () => hubService.getHubs(),
  })

  const nipplesQuery = useQuery({
    queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY,
    queryFn: () => nippleService.getNipples(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      data: SpokeLengthInput
      recordId?: string
      isPatch: boolean
      delta?: DeltaSet
      version?: number
    }) => {
      const { data: formData, recordId, isPatch, delta, version } = params
      if (isPatch && delta && recordId) {
        await SpokeService.patchSpokeLength(recordId, delta, version!)
        return
      }

      await SpokeService.saveSpokeLengthItem(formData)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => SpokeService.deleteSpokeLength(id),
  })

  const readResource = useMemo<SpokeLengthReadResource>(() => {
    const spokeFailure = resolveQueryFailure({
      data: spokeLengthsQuery.data,
      error: spokeLengthsQuery.error,
      isPending: spokeLengthsQuery.isPending,
      scope: 'useSpokeLengthMgmt.spokeLengths',
      missingMessage: '[CRITICAL] Spoke length dataset missing after load',
      failureMessage: '[CRITICAL] Spoke length query failed',
    })
    if (spokeFailure) {
      return {
        status: 'error',
        error: spokeFailure.error,
        scope: spokeFailure.scope,
      }
    }

    const hubsFailure = resolveQueryFailure({
      data: hubsQuery.data,
      error: hubsQuery.error,
      isPending: hubsQuery.isPending,
      scope: 'useSpokeLengthMgmt.hubs',
      missingMessage: '[CRITICAL] Hub master data missing after load',
      failureMessage: '[CRITICAL] Hub master query failed',
    })
    if (hubsFailure) {
      return {
        status: 'error',
        error: hubsFailure.error,
        scope: hubsFailure.scope,
      }
    }

    const nipplesFailure = resolveQueryFailure({
      data: nipplesQuery.data,
      error: nipplesQuery.error,
      isPending: nipplesQuery.isPending,
      scope: 'useSpokeLengthMgmt.nipples',
      missingMessage: '[CRITICAL] Nipple master data missing after load',
      failureMessage: '[CRITICAL] Nipple master query failed',
    })
    if (nipplesFailure) {
      return {
        status: 'error',
        error: nipplesFailure.error,
        scope: nipplesFailure.scope,
      }
    }

    if (spokeLengthsQuery.isPending || hubsQuery.isPending || nipplesQuery.isPending) {
      return { status: 'loading' }
    }

    const data = spokeLengthsQuery.data as SpokeLength[]
    const hubs = hubsQuery.data as Hub[]
    const nipples = nipplesQuery.data as Nipple[]

    const hubMap = new Map<string, Hub>()
    hubs.forEach((hub) => hubMap.set(hub.id, hub))

    const nippleMap = new Map<string, Nipple>()
    nipples.forEach((nipple) => nippleMap.set(nipple.id, nipple))

    const rows = data.map<SpokeLengthRowViewModel>((item) => {
      const product = productMap.get(item.productId)
      const hub = hubMap.get(item.hubId || '')
      const nipple = nippleMap.get(item.nippleId || '')

      return {
        item,
        productSku: product?.sku || null,
        productName: product?.name || null,
        hubName: hub?.name || null,
        nippleName: nipple?.name || null,
        searchText: [
          item.name,
          product?.sku || '',
          product?.name || '',
          hub?.name || '',
          nipple?.name || '',
          item.material || '',
          item.length || '',
        ].join(' ').toLowerCase(),
      }
    })

    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filteredData = !normalizedSearch
      ? rows
      : rows.filter((row) => row.searchText.includes(normalizedSearch))

    return {
      status: 'ready',
      data,
      filteredData,
    }
  }, [
    hubsQuery.data,
    hubsQuery.error,
    hubsQuery.isPending,
    nipplesQuery.data,
    nipplesQuery.error,
    nipplesQuery.isPending,
    productMap,
    searchTerm,
    spokeLengthsQuery.data,
    spokeLengthsQuery.error,
    spokeLengthsQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load spoke length resources: ${readResource.scope}`, readResource.error)
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const data = readResource.status === 'ready' ? readResource.data : []
  const filteredData = readResource.status === 'ready' ? readResource.filteredData : []
  const isLoading = readResource.status === 'loading'
  const isRefreshing = spokeLengthsQuery.isFetching || hubsQuery.isFetching || nipplesQuery.isFetching

  const handleDelete = async (item: SpokeLength) => {
    if (!window.confirm(t('engineering.spokeLength.toasts.deleteConfirm'))) return

    try {
      await deleteMutation.mutateAsync(item.id)
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY })
      toast.success(t('engineering.spokeLength.toasts.deleteSuccess'))
    } catch (_error) {
      toast.error('操作失败')
    }
  }

  const handleSave = async (params: {
    data: SpokeLengthInput
    recordId?: string
    isPatch: boolean
    delta?: DeltaSet
    version?: number
  }) => {
    await saveMutation.mutateAsync(params)
    await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY })
  }

  const retryRead = async () => {
    await Promise.all([
      spokeLengthsQuery.refetch(),
      hubsQuery.refetch(),
      nipplesQuery.refetch(),
    ])
  }

  return {
    readResource,
    data,
    filteredData,
    isLoading,
    isRefreshing,
    searchTerm,
    setSearchTerm,
    handleDelete,
    handleSave,
    retryRead,
    refresh: retryRead,
  }
}
