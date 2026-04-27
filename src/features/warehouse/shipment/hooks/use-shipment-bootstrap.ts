'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { WarehouseCategoryCoreService } from '../../category'
import {
  InventoryCoreService,
  InventoryMaintenanceService,
  type MasterDataSearchResult,
} from '../../inventory'
import { type WarehouseCategoryOption } from '../../category/data/schema'
import { warehouseQueryKeys } from '../../query-keys'
import { filterWarehouseCategoriesByScene } from '../../utils/warehouse-category-config'
import { type ShipmentDemand, type ShipmentRecord } from '../data/schema'
import { ShipmentCoreService } from '../services/shipment-core-service'

export type ShipmentBootstrapResource = CompositeReadResource<{
  history: ShipmentRecord[]
  shipmentDemands: ShipmentDemand[]
  warehouseCategories: WarehouseCategoryOption[]
  alertThresholds: Record<string, number>
  masterDataMap: Record<string, MasterDataSearchResult>
}>

export function useShipmentBootstrap() {
  const { t } = useLanguage()

  const historyQuery = useQuery({
    queryKey: warehouseQueryKeys.shipmentHistory(),
    queryFn: () => ShipmentCoreService.getShipmentHistory(),
  })

  const demandsQuery = useQuery({
    queryKey: warehouseQueryKeys.shipmentDemands(),
    queryFn: () => ShipmentCoreService.getShipmentDemands(),
  })

  const categoriesQuery = useQuery({
    queryKey: warehouseQueryKeys.categoryOptions(),
    queryFn: () => WarehouseCategoryCoreService.getCategoryOptions(),
  })

  const masterDataQuery = useQuery({
    queryKey: warehouseQueryKeys.masterDataAll(),
    queryFn: () => InventoryCoreService.searchMasterData(''),
  })

  const thresholdsQuery = useQuery({
    queryKey: warehouseQueryKeys.alertThresholds(),
    queryFn: () => InventoryMaintenanceService.getAlertThresholds(),
  })

  const readResource = useMemo<ShipmentBootstrapResource>(() => {
    const historyFailure = resolveQueryFailure({
      data: historyQuery.data,
      error: historyQuery.error,
      isPending: historyQuery.isPending,
      scope: 'useShipmentBootstrap.history',
      missingMessage: '[CRITICAL] Shipment history missing after load',
      failureMessage: '[CRITICAL] Shipment history query failed',
    })
    if (historyFailure) {
      return {
        status: 'error',
        error: historyFailure.error,
        scope: historyFailure.scope,
      }
    }

    const demandsFailure = resolveQueryFailure({
      data: demandsQuery.data,
      error: demandsQuery.error,
      isPending: demandsQuery.isPending,
      scope: 'useShipmentBootstrap.demands',
      missingMessage: '[CRITICAL] Shipment demands missing after load',
      failureMessage: '[CRITICAL] Shipment demands query failed',
    })
    if (demandsFailure) {
      return {
        status: 'error',
        error: demandsFailure.error,
        scope: demandsFailure.scope,
      }
    }

    const categoriesFailure = resolveQueryFailure({
      data: categoriesQuery.data,
      error: categoriesQuery.error,
      isPending: categoriesQuery.isPending,
      scope: 'useShipmentBootstrap.categories',
      missingMessage: '[CRITICAL] Shipment warehouse categories missing after load',
      failureMessage: '[CRITICAL] Shipment warehouse categories query failed',
    })
    if (categoriesFailure) {
      return {
        status: 'error',
        error: categoriesFailure.error,
        scope: categoriesFailure.scope,
      }
    }

    const masterDataFailure = resolveQueryFailure({
      data: masterDataQuery.data,
      error: masterDataQuery.error,
      isPending: masterDataQuery.isPending,
      scope: 'useShipmentBootstrap.masterData',
      missingMessage: '[CRITICAL] Shipment master data missing after load',
      failureMessage: '[CRITICAL] Shipment master data query failed',
    })
    if (masterDataFailure) {
      return {
        status: 'error',
        error: masterDataFailure.error,
        scope: masterDataFailure.scope,
      }
    }

    const thresholdsFailure = resolveQueryFailure({
      data: thresholdsQuery.data,
      error: thresholdsQuery.error,
      isPending: thresholdsQuery.isPending,
      scope: 'useShipmentBootstrap.thresholds',
      missingMessage: '[CRITICAL] Shipment alert thresholds missing after load',
      failureMessage: '[CRITICAL] Shipment alert thresholds query failed',
    })
    if (thresholdsFailure) {
      return {
        status: 'error',
        error: thresholdsFailure.error,
        scope: thresholdsFailure.scope,
      }
    }

    if (
      historyQuery.isPending ||
      demandsQuery.isPending ||
      categoriesQuery.isPending ||
      masterDataQuery.isPending ||
      thresholdsQuery.isPending
    ) {
      return { status: 'loading' }
    }

    const filteredCategories = filterWarehouseCategoriesByScene(categoriesQuery.data as WarehouseCategoryOption[], 'shipment')
    if (filteredCategories.length === 0) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] No warehouse categories allowed for shipment scene'),
        scope: 'useShipmentBootstrap.categories',
      }
    }

    const nextMasterDataMap = (masterDataQuery.data as MasterDataSearchResult[]).reduce<Record<string, MasterDataSearchResult>>((map, item) => {
      map[item.id] = item
      return map
    }, {})

    return {
      status: 'ready',
      history: historyQuery.data as ShipmentRecord[],
      shipmentDemands: demandsQuery.data as ShipmentDemand[],
      warehouseCategories: filteredCategories,
      alertThresholds: thresholdsQuery.data as Record<string, number>,
      masterDataMap: nextMasterDataMap,
    }
  }, [
    categoriesQuery.data,
    categoriesQuery.error,
    categoriesQuery.isPending,
    demandsQuery.data,
    demandsQuery.error,
    demandsQuery.isPending,
    historyQuery.data,
    historyQuery.error,
    historyQuery.isPending,
    masterDataQuery.data,
    masterDataQuery.error,
    masterDataQuery.isPending,
    thresholdsQuery.data,
    thresholdsQuery.error,
    thresholdsQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') return
    toast.error(t('warehouse.errors.queryFailed'))
    failLoudly(readResource.error, readResource.scope)
  }, [readResource, t])

  return {
    readResource,
    retryRead: async () => {
      await Promise.all([
        historyQuery.refetch(),
        demandsQuery.refetch(),
        categoriesQuery.refetch(),
        masterDataQuery.refetch(),
        thresholdsQuery.refetch(),
      ])
    },
  }
}
