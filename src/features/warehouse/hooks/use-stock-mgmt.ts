import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { failLoudly } from '@/lib/safe-catch'
import { InventoryCoreService, type InventoryView } from '../services/inventory-core-service'
import { InventoryMaintenanceService } from '../services/inventory-maintenance-service'
import { WarehouseCategoryCoreService } from '../services/warehouse-category-core-service'

/**
 * useStockMgmt - 深度重构后的库存管理 Hook 情况情况总量针对。
 * 职责：聚合多个核心查询，处理过滤器状态，并提供事务性维护操作。
 */
export function useStockMgmt() {
    const queryClient = useQueryClient()
    const { allowsAction } = useNonBlockingPermissionActions()
    const { t } = useLanguage()
    
    // 【归一化查询】：并行获取所有依赖数据情况情况总量针对。
    const inventoryQuery = useQuery({
        queryKey: ['inventory_list'],
        queryFn: () => InventoryCoreService.getInventoryList()
    })

    const valuationQuery = useQuery({
        queryKey: ['inventory_valuation'],
        queryFn: () => InventoryCoreService.getInventoryValuation()
    })

    const alertSummaryQuery = useQuery({
        queryKey: ['inventory_alert_summary'],
        queryFn: () => InventoryCoreService.getAlertSummary()
    })

    const thresholdsQuery = useQuery({
        queryKey: ['inventory_thresholds'],
        queryFn: () => InventoryMaintenanceService.getAlertThresholds()
    })

    const categoriesQuery = useQuery({
        queryKey: ['warehouse_categories'],
        queryFn: () => WarehouseCategoryCoreService.getCategories()
    })

    // UI & Filter states
    const [searchTerm, setSearchTerm] = useState('')
    const [hideZeroStockMap, setHideZeroStockMap] = useState<Record<string, boolean>>({})
    
    // Dialog states
    const [configDialogOpen, setConfigDialogOpen] = useState(false)
    const [selectedMaterial, setSelectedMaterial] = useState<{ id: string, name: string, current: number } | null>(null)
    const [tempThreshold, setTempThreshold] = useState<string>('')
    const [reconcileConfirmOpen, setReconcileConfirmOpen] = useState(false)

    // Mutations
    const reconcileMutation = useMutation({
        mutationFn: () => InventoryMaintenanceService.reconcileInventory(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_list'] })
            toast.success(t('warehouse.stock.toast.reconcileSuccess'))
            setReconcileConfirmOpen(false)
        },
        onError: (err) => failLoudly(err, 'StockMgmt.onConfirmReconcile')
    })

    const setThresholdMutation = useMutation({
        mutationFn: (params: { id: string, value: number }) => 
            InventoryMaintenanceService.setAlertThreshold(params.id, params.value),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventory_thresholds'] })
            toast.success(t('warehouse.stock.toast.thresholdUpdated', { 
                name: selectedMaterial?.name || 'Item', 
                value: variables.value 
            }))
            setConfigDialogOpen(false)
        }
    })

    // Business Logic Handlers
    const handleHardReconcile = () => {
        if (!allowsAction('action_warehouse_reconcile')) return
        setReconcileConfirmOpen(true)
    }

    const onConfirmReconcile = async () => {
        await reconcileMutation.mutateAsync()
    }

    const handleSaveThreshold = async () => {
        if (!selectedMaterial) return
        if (!allowsAction('action_warehouse_reconcile')) return
        const value = parseFloat(tempThreshold) || 0
        await setThresholdMutation.mutateAsync({ id: selectedMaterial.id, value })
    }

    // Data Aggregation & Filtering (Derived State)
    const inventory = inventoryQuery.data || []
    const alertThresholds = thresholdsQuery.data || {}
    const categories = categoriesQuery.data || []

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

    // [BACKEND-AUTHORITY]: 预警总数由后端统计服务返回
    const alertCount = alertSummaryQuery.data?.alertCount || 0

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

    // [BACKEND-AUTHORITY]: 资产估值由后端财务模块权威返回
    const totalAssetsValue = valuationQuery.data || 0

    return {
        // Data states
        groupedInventory,
        materialTotalStock,
        totalAssetsValue,
        alertThresholds,
        categories,
        loading: inventoryQuery.isLoading || thresholdsQuery.isLoading || categoriesQuery.isLoading || valuationQuery.isLoading || alertSummaryQuery.isLoading,
        error: inventoryQuery.error || thresholdsQuery.error || categoriesQuery.error || valuationQuery.error || alertSummaryQuery.error,
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
        isReconciling: reconcileMutation.isPending,

        // Handlers
        handleHardReconcile,
        onConfirmReconcile,
        handleSaveThreshold,
        refreshData: () => {
            queryClient.invalidateQueries({ queryKey: ['inventory_list'] })
            queryClient.invalidateQueries({ queryKey: ['inventory_thresholds'] })
        }
    }
}
