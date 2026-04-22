'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
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

  const error =
    historyQuery.error ??
    demandsQuery.error ??
    categoriesQuery.error ??
    masterDataQuery.error ??
    thresholdsQuery.error

  useEffect(() => {
    if (!error) return
    toast.error(t('warehouse.errors.queryFailed'))
  }, [error, t])

  const history = useMemo(() => {
    if (historyQuery.isLoading) return [] as ShipmentRecord[]
    if (!historyQuery.data) {
      const lookupError =
        historyQuery.error instanceof Error
          ? historyQuery.error
          : new Error('[CRITICAL] Shipment history missing after load')
      failLoudly(lookupError, 'useShipmentBootstrap.history')
      throw lookupError
    }
    return historyQuery.data
  }, [historyQuery.data, historyQuery.error, historyQuery.isLoading])

  const warehouseCategories = useMemo(() => {
    if (categoriesQuery.isLoading) return [] as WarehouseCategoryOption[]
    if (!categoriesQuery.data) {
      const lookupError =
        categoriesQuery.error instanceof Error
          ? categoriesQuery.error
          : new Error('[CRITICAL] Shipment warehouse categories missing after load')
      failLoudly(lookupError, 'useShipmentBootstrap.categories')
      throw lookupError
    }

    const filteredCategories = filterWarehouseCategoriesByScene(categoriesQuery.data, 'shipment')
    if (filteredCategories.length === 0) {
      const lookupError = new Error('[CRITICAL] No warehouse categories allowed for shipment scene')
      failLoudly(lookupError, 'useShipmentBootstrap.categories')
      throw lookupError
    }

    return filteredCategories
  }, [categoriesQuery.data, categoriesQuery.error, categoriesQuery.isLoading])

  const shipmentDemands = useMemo(() => {
    if (demandsQuery.isLoading) return [] as ShipmentDemand[]
    if (!demandsQuery.data) {
      const lookupError =
        demandsQuery.error instanceof Error
          ? demandsQuery.error
          : new Error('[CRITICAL] Shipment demands missing after load')
      failLoudly(lookupError, 'useShipmentBootstrap.demands')
      throw lookupError
    }
    return demandsQuery.data
  }, [demandsQuery.data, demandsQuery.error, demandsQuery.isLoading])

  const alertThresholds = useMemo(() => {
    if (thresholdsQuery.isLoading) return {}
    if (!thresholdsQuery.data) {
      const lookupError =
        thresholdsQuery.error instanceof Error
          ? thresholdsQuery.error
          : new Error('[CRITICAL] Shipment alert thresholds missing after load')
      failLoudly(lookupError, 'useShipmentBootstrap.thresholds')
      throw lookupError
    }
    return thresholdsQuery.data
  }, [thresholdsQuery.data, thresholdsQuery.error, thresholdsQuery.isLoading])
  const masterDataMap = useMemo(() => {
    if (masterDataQuery.isLoading) return {}
    if (!masterDataQuery.data) {
      const lookupError =
        masterDataQuery.error instanceof Error
          ? masterDataQuery.error
          : new Error('[CRITICAL] Shipment master data missing after load')
      failLoudly(lookupError, 'useShipmentBootstrap.masterData')
      throw lookupError
    }

    const nextMasterDataMap: Record<string, MasterDataSearchResult> = {}
    masterDataQuery.data.forEach((item: MasterDataSearchResult) => {
      nextMasterDataMap[item.id] = item
    })
    return nextMasterDataMap
  }, [masterDataQuery.data, masterDataQuery.error, masterDataQuery.isLoading])

  return {
    history,
    shipmentDemands,
    warehouseCategories,
    alertThresholds,
    masterDataMap,
    error,
  }
}
