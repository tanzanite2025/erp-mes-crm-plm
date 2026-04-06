import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import { inventoryService, type InventoryView } from '../services/inventory-service'
import { warehouseCategoryService } from '../services/category-service'

export function useStockMgmt() {
    const { allowsAction } = useNonBlockingPermissionActions()
    const { t } = useLanguage()
    
    // Core data states
    const [inventory, setInventory] = useState<InventoryView[]>([])
    const [alertThresholds, setAlertThresholds] = useState<Record<string, number>>({})
    const [categories, setCategories] = useState<Array<{ code: string, name: string }>>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<unknown>(null)

    // UI & Filter states
    const [searchTerm, setSearchTerm] = useState('')
    const [hideZeroStockMap, setHideZeroStockMap] = useState<Record<string, boolean>>({})
    
    // Dialog states
    const [configDialogOpen, setConfigDialogOpen] = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<{ id: string, name: string, current: number } | null>(null)
    const [tempThreshold, setTempThreshold] = useState<string>('')
    const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false)
    const [isReconciling, setIsReconciling] = useState(false)

    // Data Fetching logic
    const refreshData = useCallback(async () => {
        setLoading(true)
        try {
            setError(null)
            const [data, thresholds, categoryData] = await Promise.all([
                inventoryService.getInventoryList(),
                inventoryService.getAlertThresholds(),
                warehouseCategoryService.getCategories()
            ])
            setInventory(data)
            setAlertThresholds(thresholds)
            setCategories(categoryData || [])
        } catch (loadError) {
            setError(loadError)
            toast.error(t('warehouse.stock.toast.loadFailed'))
        } finally {
            setLoading(false)
        }
    }, [t])

    useEffect(() => {
        void refreshData()
        window.addEventListener('xdfc_inventory_updated', refreshData)
        return () => window.removeEventListener('xdfc_inventory_updated', refreshData)
    }, [refreshData])

    // Business Logic - Reconcile
    const handleHardReconcile = () => {
        if (!allowsAction('action_warehouse_reconcile')) return
        setReconcileConfirmOpen(true)
    }

    const onConfirmReconcile = async () => {
        setIsReconciling(true)
        try {
            await inventoryService.reconcileInventory()
            await refreshData()
            toast.success(t('warehouse.stock.toast.reconcileSuccess'))
            setReconcileConfirmOpen(false)
        } catch (error) {
            failLoudly(error, 'StockMgmt.onConfirmReconcile')
        } finally {
            setIsReconciling(false)
        }
    }

    // Business Logic - Threshold
    const handleSaveThreshold = async () => {
        if (!selectedMaterial) return
        if (!allowsAction('action_warehouse_reconcile')) return
        const value = parseFloat(tempThreshold) || 0
        await inventoryService.setAlertThreshold(selectedMaterial.id, value)
        toast.success(t('warehouse.stock.toast.thresholdUpdated', { name: selectedMaterial.name, value }))
        setConfigDialogOpen(false)
        void refreshData()
    }

    // Data Aggregation & Filtering
    const materialTotalStock = useMemo(() => {
        const totals: Record<string, number> = {}
        inventory.forEach((item) => {
            totals[item.materialId] = (totals[item.materialId] || 0) + item.quantity
        })
        return totals
    }, [inventory])

    const filteredInventory = useMemo(() => {
        return inventory.filter((item) =>
            item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
        )
    }, [inventory, searchTerm])

    const alertCount = useMemo(() => {
        return Object.entries(materialTotalStock).filter(([id, qty]) => {
            const min = alertThresholds[id] || 0
            return min > 0 && qty < min
        }).length
    }, [materialTotalStock, alertThresholds])

    const groupedInventory = useMemo(() => {
        const groups: Record<string, InventoryView[]> = {}
        categories.forEach((cat) => { groups[cat.code] = [] })

        filteredInventory.forEach((item) => {
            let catCode = (item.categoryCode || 'MATERIAL').trim()
            if (!categories.some((category) => category.code === catCode)) catCode = 'MATERIAL'
            if (!groups[catCode]) groups[catCode] = []
            groups[catCode].push(item)
        })
        return groups
    }, [filteredInventory, categories])

    const totalAssetsValue = useMemo(() => {
        return inventory.reduce((acc, item) => acc + (item.totalValue || 0), 0)
    }, [inventory])

    return {
        // Data states
        groupedInventory,
        materialTotalStock,
        totalAssetsValue,
        alertThresholds,
        categories,
        loading,
        error,
        alertCount,

        // UI & Filter states
        searchTerm,
        setSearchTerm,
        hideZeroStockMap,
        setHideZeroStockMap,

        // Dialog states
        configDialogOpen,
        setConfigDialogOpen,
        selectedMaterial,
        setSelectedMaterial,
        tempThreshold,
        setTempThreshold,
        reconcileConfirmOpen,
        setReconcileConfirmOpen,
        isReconciling,

        // Handlers
        handleHardReconcile,
        onConfirmReconcile,
        handleSaveThreshold,
        refreshData
    }
}
