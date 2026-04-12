import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type SpokeLength } from '../data/schema'
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

export function useSpokeLengthMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { productMap } = useEngineeringDbProductLookup()
  const [searchTerm, setSearchTerm] = useState('')

  const { data = [], isLoading: isSpokeLengthsLoading } = useQuery({
    queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY,
    queryFn: () => SpokeService.getSpokeLength(),
  })

  const { data: hubs = [], isLoading: isHubsLoading } = useQuery({
    queryKey: ENGINEERING_DB_HUBS_QUERY_KEY,
    queryFn: () => hubService.getHubs(),
  })

  const { data: nipples = [], isLoading: isNipplesLoading } = useQuery({
    queryKey: ENGINEERING_DB_NIPPLES_QUERY_KEY,
    queryFn: () => nippleService.getNipples(),
  })

  const saveMutation = useMutation({
    mutationFn: async (params: {
      data: SpokeLength
      isPatch: boolean
      delta?: any
      version?: number
    }) => {
      const { data: formData, isPatch, delta, version } = params
      if (isPatch && delta) {
        await SpokeService.patchSpokeLength(formData.id, delta, version!)
        return
      }

      await SpokeService.saveSpokeLengthItem(formData)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => SpokeService.deleteSpokeLength(id),
  })

  const isLoading = isSpokeLengthsLoading || isHubsLoading || isNipplesLoading

  const hubMap = useMemo(() => {
    const map = new Map<string, Hub>()
    hubs.forEach((hub) => map.set(hub.id, hub))
    return map
  }, [hubs])

  const nippleMap = useMemo(() => {
    const map = new Map<string, Nipple>()
    nipples.forEach((nipple) => map.set(nipple.id, nipple))
    return map
  }, [nipples])

  const filteredData = useMemo(() => {
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
    if (!normalizedSearch) {
      return rows
    }

    return rows.filter((row) => row.searchText.includes(normalizedSearch))
  }, [data, productMap, hubMap, nippleMap, searchTerm])

  const handleDelete = async (item: SpokeLength) => {
    if (!window.confirm(t('engineering.spokeLength.toasts.deleteConfirm'))) return

    try {
      await deleteMutation.mutateAsync(item.id)
      await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY })
      toast.success(t('engineering.spokeLength.toasts.deleteSuccess'))
    } catch (error) {
      toast.error(t('common.status.error' as any))
    }
  }

  const handleSave = async (params: {
    data: SpokeLength
    isPatch: boolean
    delta?: any
    version?: number
  }) => {
    await saveMutation.mutateAsync(params)
    await queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY })
  }

  return {
    data,
    filteredData,
    isLoading,
    searchTerm,
    setSearchTerm,
    handleDelete,
    handleSave,
    refresh: () => queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY }),
  }
}
