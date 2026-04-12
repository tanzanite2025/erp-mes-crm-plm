'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { WarehouseCategoryCoreService } from '../../category'
import {
  InventoryCoreService,
  InventoryMaintenanceService,
  type MasterDataSearchResult,
} from '../../inventory'
import { type WarehouseCategoryOption } from '../../category/data/schema'
import { warehouseQueryKeys } from '../../query-keys'
import { filterWarehouseCategoriesByScene } from '../../utils/warehouse-category-config'
import { type ShipmentRecord } from '../data/schema'
import { ShipmentCoreService } from '../services/shipment-core-service'

export function useShipmentBootstrap() {
  const { t } = useLanguage()

  const historyQuery = useQuery({
    queryKey: warehouseQueryKeys.shipmentHistory(),
    queryFn: () => ShipmentCoreService.getShipmentHistory(),
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
    categoriesQuery.error ??
    masterDataQuery.error ??
    thresholdsQuery.error

  useEffect(() => {
    if (!error) return
    toast.error(t('warehouse.errors.queryFailed'))
  }, [error, t])

  const history = useMemo(() => historyQuery.data ?? ([] as ShipmentRecord[]), [historyQuery.data])
  const warehouseCategories = useMemo(
    () => filterWarehouseCategoriesByScene(categoriesQuery.data ?? ([] as WarehouseCategoryOption[]), 'shipment'),
    [categoriesQuery.data],
  )
  const alertThresholds = useMemo(() => thresholdsQuery.data ?? {}, [thresholdsQuery.data])
  const masterDataMap = useMemo(() => {
    const nextMasterDataMap: Record<string, MasterDataSearchResult> = {}
    ;(masterDataQuery.data ?? []).forEach((item: MasterDataSearchResult) => {
      nextMasterDataMap[item.id] = item
    })
    return nextMasterDataMap
  }, [masterDataQuery.data])

  return {
    history,
    warehouseCategories,
    alertThresholds,
    masterDataMap,
    error,
  }
}
