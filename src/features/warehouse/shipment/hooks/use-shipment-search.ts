'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { InventoryCoreService, type MasterDataSearchResult } from '../../inventory'
import { warehouseQueryKeys } from '../../query-keys'

export function useShipmentSearch() {
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
    queryKey: warehouseQueryKeys.masterDataSearch(debouncedSearchQuery),
    queryFn: (): Promise<MasterDataSearchResult[]> => InventoryCoreService.searchMasterData(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  useEffect(() => {
    if (!debouncedSearchQuery || !searchResultsQuery.isSuccess) return
    if ((searchResultsQuery.data ?? []).length > 0) return
    toast.error(t('warehouse.shipment.toast.notFound'))
  }, [debouncedSearchQuery, searchResultsQuery.data, searchResultsQuery.isSuccess, t])

  return {
    searchQuery,
    setSearchQuery,
    searchResults: debouncedSearchQuery ? (searchResultsQuery.data ?? []) : [],
    isSearching: searchResultsQuery.isFetching,
  }
}
