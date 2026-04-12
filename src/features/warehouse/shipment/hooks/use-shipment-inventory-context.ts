'use client'

import { useQuery } from '@tanstack/react-query'
import { InventoryCoreService, type MasterDataSearchResult } from '../../inventory'
import { warehouseQueryKeys } from '../../query-keys'

interface UseShipmentInventoryContextOptions {
  selectedItem: MasterDataSearchResult | null
  sourceCategory: string
}

export function useShipmentInventoryContext({
  selectedItem,
  sourceCategory,
}: UseShipmentInventoryContextOptions) {
  const inventoryBreakdownQuery = useQuery({
    queryKey: warehouseQueryKeys.inventoryBreakdown(selectedItem?.id ?? ''),
    queryFn: () => InventoryCoreService.getInventoryBreakdown(selectedItem!.id),
    enabled: Boolean(selectedItem),
  })

  const categoryStockQuery = useQuery({
    queryKey: warehouseQueryKeys.categoryStock(selectedItem?.id ?? '', sourceCategory),
    queryFn: () => InventoryCoreService.getCategoryStock(selectedItem!.id, sourceCategory),
    enabled: Boolean(selectedItem && sourceCategory),
  })

  return {
    categoryStock: selectedItem && sourceCategory ? (categoryStockQuery.data ?? 0) : 0,
    inventoryBreakdown: selectedItem ? (inventoryBreakdownQuery.data ?? {}) : {},
  }
}
