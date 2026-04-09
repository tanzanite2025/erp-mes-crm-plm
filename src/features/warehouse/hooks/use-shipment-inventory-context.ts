'use client'

import { useEffect, useState } from 'react'
import { type MasterDataSearchResult, InventoryCoreService } from '../services/inventory-core-service'

interface UseShipmentInventoryContextOptions {
  selectedItem: MasterDataSearchResult | null
  sourceCategory: string
}

export function useShipmentInventoryContext({
  selectedItem,
  sourceCategory,
}: UseShipmentInventoryContextOptions) {
  const [categoryStock, setCategoryStock] = useState(0)
  const [inventoryBreakdown, setInventoryBreakdown] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!selectedItem) {
      setInventoryBreakdown({})
      return
    }

    let disposed = false

    void InventoryCoreService.getInventoryBreakdown(selectedItem.id).then((nextBreakdown) => {
      if (!disposed) {
        setInventoryBreakdown(nextBreakdown)
      }
    })

    return () => {
      disposed = true
    }
  }, [selectedItem])

  useEffect(() => {
    if (!selectedItem || !sourceCategory) {
      setCategoryStock(0)
      return
    }

    let disposed = false

    void InventoryCoreService.getCategoryStock(selectedItem.id, sourceCategory).then((nextCategoryStock) => {
      if (!disposed) {
        setCategoryStock(nextCategoryStock)
      }
    })

    return () => {
      disposed = true
    }
  }, [selectedItem, sourceCategory])

  return {
    categoryStock,
    inventoryBreakdown,
  }
}
