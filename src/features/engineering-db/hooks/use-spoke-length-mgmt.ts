import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
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

export function useSpokeLengthMgmt() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const { data: products = [] } = useGetProducts()
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

  const productMap = useMemo(() => {
    const map = new Map<string, any>()
    products.forEach((product) => map.set(product.id, product))
    return map
  }, [products])

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
    return data.filter((item) => {
      const product = productMap.get(item.productId)
      const hub = hubMap.get(item.hubId || '')
      const nipple = nippleMap.get(item.nippleId || '')
      const searchStr = searchTerm.toLowerCase()

      return item.name.toLowerCase().includes(searchStr) ||
        (product?.sku || '').toLowerCase().includes(searchStr) ||
        (hub?.name || '').toLowerCase().includes(searchStr) ||
        (nipple?.name || '').toLowerCase().includes(searchStr) ||
        (item.material || '').toLowerCase().includes(searchStr)
    })
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
    productMap,
    hubMap,
    nippleMap,
    handleDelete,
    handleSave,
    refresh: () => queryClient.invalidateQueries({ queryKey: ENGINEERING_DB_SPOKE_LENGTHS_QUERY_KEY }),
  }
}
