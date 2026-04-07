import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'

import { InventoryCoreService } from '../services/inventory-core-service'
import { InventoryMaintenanceService } from '../services/inventory-maintenance-service'
import { type InboundRecord, type ShipmentRecord } from '../services/inventory-transaction-service'
import { type MasterDataSearchResult } from '../services/inventory-core-service'
import { WarehouseExportService } from '../services/warehouse-export-service'

const logger = createLogger('useWarehouseReport')

export function useReport() {
    const { locale, t } = useLanguage()
    const [activeTab, setActiveTab] = useState('inbound')
    const [inboundData, setInboundData] = useState<InboundRecord[]>([])
    const [shipmentData, setShipmentData] = useState<ShipmentRecord[]>([])
    const [masterDataMap, setMasterDataMap] = useState<Record<string, MasterDataSearchResult>>({})
    const [error, setError] = useState<unknown>(null)
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        query: ''
    })

    const loadData = useCallback(async () => {
        try {
            setError(null)
            const [inbound, shipment, masterList] = await Promise.all([
                InventoryCoreService.getInboundHistory(),
                InventoryCoreService.getShipmentHistory(),
                InventoryCoreService.searchMasterData('')
            ])

            const map: Record<string, MasterDataSearchResult> = {}
            masterList.forEach((item: MasterDataSearchResult) => { map[item.id] = item })

            setInboundData(inbound)
            setShipmentData(shipment)
            setMasterDataMap(map)
        } catch (loadError) {
            setError(loadError)
            logger.error('Failed to load report data', loadError)
        }
    }, [])

    useEffect(() => {
        const timer = globalThis.setTimeout(() => {
            void loadData()
        }, 0)

        return () => {
            globalThis.clearTimeout(timer)
        }
    }, [loadData])

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

    const handleReconcile = async () => {
        if (!confirm(t('warehouse.reports.reconcileConfirm'))) return

        try {
            const result = await InventoryMaintenanceService.reconcileInventory()
            await loadData()
            toast.success(t('warehouse.reports.reconcileSuccess', {
                totalItems: result.totalItems,
                fixedNegatives: result.fixedNegatives
            }))
            return true
        } catch (error) {
            logger.error('Inventory reconciliation failed', error)
            toast.error(t('warehouse.reports.reconcileFailed'))
            return false
        }
    }

    const hasData = activeTab === 'inbound' ? filteredInbound.length > 0 : filteredShipment.length > 0

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
