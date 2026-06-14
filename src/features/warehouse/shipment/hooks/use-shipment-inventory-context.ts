'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import {
  InventoryCoreService,
  type MasterDataSearchResult,
} from '../../inventory'
import { warehouseQueryKeys } from '../../query-keys'

const logger = createLogger('useShipmentInventoryContext')

interface UseShipmentInventoryContextOptions {
  selectedItem: MasterDataSearchResult | null
  sourceCategory: string
}

export type ShipmentInventoryContextResource =
  | { status: 'idle' }
  | CompositeReadResource<{
      categoryStock: number
      inventoryBreakdown: Record<string, number>
    }>

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
    queryKey: warehouseQueryKeys.categoryStock(
      selectedItem?.id ?? '',
      sourceCategory
    ),
    queryFn: () =>
      InventoryCoreService.getCategoryStock(selectedItem!.id, sourceCategory),
    enabled: Boolean(selectedItem && sourceCategory),
  })

  const readResource = useMemo<ShipmentInventoryContextResource>(() => {
    if (!selectedItem) {
      return { status: 'idle' }
    }

    const inventoryBreakdownFailure = resolveQueryFailure({
      data: inventoryBreakdownQuery.data,
      error: inventoryBreakdownQuery.error,
      isPending: inventoryBreakdownQuery.isPending,
      scope: 'useShipmentInventoryContext.inventoryBreakdown',
      missingMessage:
        '[CRITICAL] Shipment inventory breakdown missing after load',
      failureMessage: '[CRITICAL] Shipment inventory breakdown query failed',
    })
    if (inventoryBreakdownFailure) {
      return {
        status: 'error',
        error: inventoryBreakdownFailure.error,
        scope: inventoryBreakdownFailure.scope,
      }
    }

    if (sourceCategory) {
      const categoryStockFailure = resolveQueryFailure({
        data: categoryStockQuery.data,
        error: categoryStockQuery.error,
        isPending: categoryStockQuery.isPending,
        scope: 'useShipmentInventoryContext.categoryStock',
        missingMessage: '[CRITICAL] Shipment category stock missing after load',
        failureMessage: '[CRITICAL] Shipment category stock query failed',
      })
      if (categoryStockFailure) {
        return {
          status: 'error',
          error: categoryStockFailure.error,
          scope: categoryStockFailure.scope,
        }
      }
    }

    if (
      inventoryBreakdownQuery.isPending ||
      (Boolean(sourceCategory) && categoryStockQuery.isPending)
    ) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      categoryStock: sourceCategory ? (categoryStockQuery.data as number) : 0,
      inventoryBreakdown: inventoryBreakdownQuery.data as Record<
        string,
        number
      >,
    }
  }, [
    categoryStockQuery.data,
    categoryStockQuery.error,
    categoryStockQuery.isPending,
    inventoryBreakdownQuery.data,
    inventoryBreakdownQuery.error,
    inventoryBreakdownQuery.isPending,
    selectedItem,
    sourceCategory,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load shipment inventory context: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    readResource,
    retryRead: async () => {
      await Promise.all([
        inventoryBreakdownQuery.refetch(),
        sourceCategory
          ? categoryStockQuery.refetch()
          : Promise.resolve(undefined),
      ])
    },
  }
}
