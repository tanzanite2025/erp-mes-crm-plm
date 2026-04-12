import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import {
    InventoryCoreService,
    InventoryMaintenanceService,
    type MasterDataSearchResult,
} from '../inventory'
import { ShipmentCoreService } from '../shipment'
import { WarehouseExportService } from '../services/warehouse-export-service'
import { warehouseQueryKeys } from '../query-keys'

const logger = createLogger('useWarehouseReport')

export function useReport() {
    const { locale, t } = useLanguage()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('inbound')
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        query: ''
    })

    const inboundQuery = useQuery({
        queryKey: warehouseQueryKeys.inboundHistory(),
        queryFn: () => InventoryCoreService.getInboundHistory(),
    })

    const shipmentQuery = useQuery({
        queryKey: warehouseQueryKeys.shipmentHistory(),
        queryFn: () => ShipmentCoreService.getShipmentHistory(),
    })

    const masterDataQuery = useQuery({
        queryKey: warehouseQueryKeys.masterDataAll(),
        queryFn: () => InventoryCoreService.searchMasterData(''),
    })

    const inboundData = useMemo(() => inboundQuery.data ?? [], [inboundQuery.data])
    const shipmentData = useMemo(() => shipmentQuery.data ?? [], [shipmentQuery.data])
    const masterDataMap = useMemo(() => {
        const map: Record<string, MasterDataSearchResult> = {}
        ;(masterDataQuery.data ?? []).forEach((item: MasterDataSearchResult) => {
            map[item.id] = item
        })
        return map
    }, [masterDataQuery.data])

    const filteredInbound = useMemo(() => {
        return inboundData.filter((item) => {
            const date = item.entryDate
            const master = masterDataMap[item.materialId]
            const matchDate = (!filters.startDate || date >= filters.startDate) &&
                (!filters.endDate || date <= filters.endDate)
            const query = filters.query.toLowerCase()
            const matchQuery = !filters.query ||
                master?.name.toLowerCase().includes(query) ||
                master?.code.toLowerCase().includes(query)
            return matchDate && matchQuery
        })
    }, [inboundData, masterDataMap, filters])

    const filteredShipment = useMemo(() => {
        return shipmentData.filter((item) => {
            const date = item.shipmentDate
            const master = masterDataMap[item.materialId]
            const matchDate = (!filters.startDate || date >= filters.startDate) &&
                (!filters.endDate || date <= filters.endDate)
            const query = filters.query.toLowerCase()
            const matchQuery = !filters.query ||
                master?.name.toLowerCase().includes(query) ||
                master?.code.toLowerCase().includes(query)
            return matchDate && matchQuery
        })
    }, [shipmentData, masterDataMap, filters])

    const handleExport = () => {
        if (activeTab === 'inbound') {
            void WarehouseExportService.exportInbound(filteredInbound, masterDataMap, locale)
        } else {
            void WarehouseExportService.exportShipment(filteredShipment, masterDataMap, locale)
        }
    }

    const resetFilters = () => setFilters({ startDate: '', endDate: '', query: '' })

    const reconcileMutation = useMutation({
        mutationFn: () => InventoryMaintenanceService.reconcileInventory(),
        onSuccess: async (result) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inboundHistory() }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.shipmentHistory() }),
                queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.masterDataAll() }),
            ])
            toast.success(t('warehouse.reports.reconcileSuccess', {
                totalItems: result.totalItems,
                fixedNegatives: result.fixedNegatives
            }))
        },
        onError: (error) => {
            logger.error('Inventory reconciliation failed', error)
            toast.error(t('warehouse.reports.reconcileFailed'))
        },
    })

    const handleReconcile = async () => {
        if (!confirm(t('warehouse.reports.reconcileConfirm'))) return false

        try {
            await reconcileMutation.mutateAsync()
            return true
        } catch {
            return false
        }
    }

    const hasData = activeTab === 'inbound' ? filteredInbound.length > 0 : filteredShipment.length > 0
    const error = inboundQuery.error ?? shipmentQuery.error ?? masterDataQuery.error

    if (error) {
        logger.error('Failed to load report data', error)
    }

    return {
        activeTab,
        setActiveTab,
        error,
        filters,
        setFilters,
        filteredInbound,
        filteredShipment,
        masterDataMap,
        handleExport,
        handleReconcile,
        resetFilters,
        hasData
    }
}
