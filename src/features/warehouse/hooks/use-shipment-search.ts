'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type MasterDataSearchResult, InventoryCoreService } from '../services/inventory-core-service'

export function useShipmentSearch() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MasterDataSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const results = await InventoryCoreService.searchMasterData(searchQuery)
      setSearchResults(results)

      if (results.length === 0) {
        toast.error(t('warehouse.shipment.toast.notFound'))
      }
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, t])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      void handleSearch()
    }, 300)

    return () => clearTimeout(timer)
  }, [handleSearch, searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
  }
}
