'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type MasterDataSearchResult, InventoryCoreService } from '../services/inventory-core-service'
import { type ShipmentRecord } from '../services/inventory-transaction-service'
import { InventoryMaintenanceService } from '../services/inventory-maintenance-service'
import { WarehouseCategoryCoreService } from '../services/warehouse-category-core-service'
import { type WarehouseCategoryOption } from './shipment-hook-types'
import { filterWarehouseCategoriesByScene } from '../utils/warehouse-category-config'

export function useShipmentBootstrap() {
  const { t } = useLanguage()
  const [history, setHistory] = useState<ShipmentRecord[]>([])
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategoryOption[]>([])
  const [alertThresholds, setAlertThresholds] = useState<Record<string, number>>({})
  const [masterDataMap, setMasterDataMap] = useState<Record<string, MasterDataSearchResult>>({})
  const [error, setError] = useState<unknown>(null)

  const refreshData = useCallback(async () => {
    try {
      setError(null)

      const [recentHistory, categories, allMasterData, thresholds] = await Promise.all([
        InventoryCoreService.getShipmentHistory(),
        WarehouseCategoryCoreService.getCategoryOptions() as Promise<WarehouseCategoryOption[]>,
        InventoryCoreService.searchMasterData(''),
        InventoryMaintenanceService.getAlertThresholds(),
      ])

      if (!recentHistory || !categories || !thresholds) {
        throw new Error('[CRITICAL] Mandatory inventory master data missing during rehydration')
      }

      setHistory(recentHistory)
      setWarehouseCategories(filterWarehouseCategoriesByScene(categories, 'shipment'))
      setAlertThresholds(thresholds)

      const nextMasterDataMap: Record<string, MasterDataSearchResult> = {}
      allMasterData.forEach((item) => {
        nextMasterDataMap[item.id] = item
      })
      setMasterDataMap(nextMasterDataMap)
    } catch (loadError) {
      setError(loadError)
      toast.error(t('warehouse.errors.queryFailed'))
    }
  }, [t])

  useEffect(() => {
    void refreshData()
  }, [refreshData])

  return {
    history,
    warehouseCategories,
    alertThresholds,
    masterDataMap,
    error,
    refreshData,
  }
}
