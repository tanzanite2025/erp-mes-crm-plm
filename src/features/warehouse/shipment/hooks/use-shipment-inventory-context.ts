'use client'

import { useEffect, useState } from 'react'
import { InventoryCoreService, type MasterDataSearchResult } from '../../inventory'

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
    categoryStock: selectedItem && sourceCategory ? categoryStock : 0,
    inventoryBreakdown: selectedItem ? inventoryBreakdown : {},
  }
}
