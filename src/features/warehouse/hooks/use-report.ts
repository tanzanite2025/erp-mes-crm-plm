import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import {
  InventoryCoreService,
  InventoryMaintenanceService,
  type InboundRecord,
  type MasterDataSearchResult,
} from '../inventory'
import { warehouseQueryKeys } from '../query-keys'
import { WarehouseExportService } from '../services/warehouse-export-service'
import { WarehouseMasterDataService } from '../services/warehouse-master-data-service'
import { ShipmentCoreService, type ShipmentRecord } from '../shipment'
import {
  createWarehouseUiFeedback,
  type WarehouseUiFeedback,
} from './warehouse-ui-feedback'

const logger = createLogger('useWarehouseReport')

type ReportReadResource = CompositeReadResource<{
  filteredInbound: InboundRecord[]
  filteredShipment: ShipmentRecord[]
  masterDataMap: Record<string, MasterDataSearchResult>
  hasData: boolean
}>

export function useReport(
  feedback?: Pick<WarehouseUiFeedback, 'confirm' | 'error' | 'success'>
) {
  const { locale, t } = useLanguage()
  const ui = useMemo(() => feedback ?? createWarehouseUiFeedback(), [feedback])
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('inbound')
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    query: '',
  })

  const inboundQuery = useQuery({
    queryKey: warehouseQueryKeys.inboundHistory(),
    queryFn: () => InventoryCoreService.getInboundHistory(),
  })
  const { refetch: refetchInbound } = inboundQuery

  const shipmentQuery = useQuery({
    queryKey: warehouseQueryKeys.shipmentHistory(),
    queryFn: () => ShipmentCoreService.getShipmentHistory(),
  })
  const { refetch: refetchShipment } = shipmentQuery

  const masterDataQuery = useQuery({
    queryKey: warehouseQueryKeys.masterDataAll(),
    queryFn: () =>
      WarehouseMasterDataService.searchSelectableItems({
        query: '',
        scope: 'ALL',
      }),
  })
  const { refetch: refetchMasterData } = masterDataQuery

  const readResource = useMemo<ReportReadResource>(() => {
    const inboundFailure = resolveQueryFailure({
      data: inboundQuery.data,
      error: inboundQuery.error,
      isPending: inboundQuery.isPending,
      scope: 'useReport.inboundHistory',
      missingMessage: '[CRITICAL] Inbound report data is missing after load',
      failureMessage: '[CRITICAL] Inbound report query failed',
    })
    if (inboundFailure) {
      return {
        status: 'error',
        error: inboundFailure.error,
        scope: inboundFailure.scope,
      }
    }

    const shipmentFailure = resolveQueryFailure({
      data: shipmentQuery.data,
      error: shipmentQuery.error,
      isPending: shipmentQuery.isPending,
      scope: 'useReport.shipmentHistory',
      missingMessage: '[CRITICAL] Shipment report data is missing after load',
      failureMessage: '[CRITICAL] Shipment report query failed',
    })
    if (shipmentFailure) {
      return {
        status: 'error',
        error: shipmentFailure.error,
        scope: shipmentFailure.scope,
      }
    }

    const masterDataFailure = resolveQueryFailure({
      data: masterDataQuery.data,
      error: masterDataQuery.error,
      isPending: masterDataQuery.isPending,
      scope: 'useReport.masterDataAll',
      missingMessage: '[CRITICAL] Report master data is missing after load',
      failureMessage: '[CRITICAL] Report master data query failed',
    })
    if (masterDataFailure) {
      return {
        status: 'error',
        error: masterDataFailure.error,
        scope: masterDataFailure.scope,
      }
    }

    if (
      inboundQuery.isPending ||
      shipmentQuery.isPending ||
      masterDataQuery.isPending
    ) {
      return { status: 'loading' }
    }

    const inboundData = inboundQuery.data as InboundRecord[]
    const shipmentData = shipmentQuery.data as ShipmentRecord[]
    const masterData = masterDataQuery.data as MasterDataSearchResult[]
    const masterDataMap = masterData.reduce<
      Record<string, MasterDataSearchResult>
    >((map, item) => {
      map[item.id] = item
      return map
    }, {})

    const filteredInbound = inboundData.filter((item) => {
      const date = item.entryDate
      const master = masterDataMap[item.materialId]
      const matchDate =
        (!filters.startDate || date >= filters.startDate) &&
        (!filters.endDate || date <= filters.endDate)
      const query = filters.query.toLowerCase()
      const matchQuery =
        !filters.query ||
        master?.name.toLowerCase().includes(query) ||
        master?.code.toLowerCase().includes(query)
      return matchDate && matchQuery
    })

    const filteredShipment = shipmentData.filter((item) => {
      const date = item.shipmentDate
      const master = masterDataMap[item.materialId]
      const matchDate =
        (!filters.startDate || date >= filters.startDate) &&
        (!filters.endDate || date <= filters.endDate)
      const query = filters.query.toLowerCase()
      const matchQuery =
        !filters.query ||
        master?.name.toLowerCase().includes(query) ||
        master?.code.toLowerCase().includes(query)
      return matchDate && matchQuery
    })

    return {
      status: 'ready',
      filteredInbound,
      filteredShipment,
      masterDataMap,
      hasData:
        activeTab === 'inbound'
          ? filteredInbound.length > 0
          : filteredShipment.length > 0,
    }
  }, [
    activeTab,
    filters,
    inboundQuery.data,
    inboundQuery.error,
    inboundQuery.isPending,
    masterDataQuery.data,
    masterDataQuery.error,
    masterDataQuery.isPending,
    shipmentQuery.data,
    shipmentQuery.error,
    shipmentQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load warehouse report data: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const retryRead = useCallback(async () => {
    await Promise.all([
      refetchInbound(),
      refetchShipment(),
      refetchMasterData(),
    ])
  }, [refetchInbound, refetchMasterData, refetchShipment])

  const handleExport = () => {
    if (readResource.status !== 'ready') {
      return
    }

    if (activeTab === 'inbound') {
      void WarehouseExportService.exportInbound(
        readResource.filteredInbound,
        readResource.masterDataMap,
        locale
      )
    } else {
      void WarehouseExportService.exportShipment(
        readResource.filteredShipment,
        readResource.masterDataMap,
        locale
      )
    }
  }

  const resetFilters = () =>
    setFilters({ startDate: '', endDate: '', query: '' })

  const reconcileMutation = useMutation({
    mutationFn: () => InventoryMaintenanceService.reconcileInventory(),
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inboundHistory(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.shipmentHistory(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.masterDataAll(),
        }),
      ])
      ui.success(
        t('warehouse.reports.reconcileSuccess', {
          totalItems: result.totalItems,
          fixedNegatives: result.fixedNegatives,
        })
      )
    },
    onError: (error) => {
      logger.error('Inventory reconciliation failed', error)
      ui.error(t('warehouse.reports.reconcileFailed'))
    },
  })

  const handleReconcile = async () => {
    if (!ui.confirm(t('warehouse.reports.reconcileConfirm'))) return false

    try {
      await reconcileMutation.mutateAsync()
      return true
    } catch {
      return false
    }
  }

  return {
    activeTab,
    setActiveTab,
    readResource,
    filters,
    setFilters,
    retryRead,
    handleExport,
    handleReconcile,
    resetFilters,
    hasData: readResource.status === 'ready' ? readResource.hasData : false,
  }
}
