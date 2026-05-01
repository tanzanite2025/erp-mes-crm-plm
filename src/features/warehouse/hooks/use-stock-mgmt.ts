import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { WarehouseCategoryCoreService } from '../category'
import type { WarehouseCategory } from '../category/services/warehouse-category-core-service'
import { InventoryCoreService, InventoryMaintenanceService, type InventoryView } from '../inventory'
import { warehouseQueryKeys } from '../query-keys'
import { createWarehouseUiFeedback, type WarehouseUiFeedback } from './warehouse-ui-feedback'

const logger = createLogger('useStockMgmt')

type StockMgmtReadResource = CompositeReadResource<{
    groupedInventory: Record<string, InventoryView[]>
    materialTotalStock: Record<string, number>
    totalAssetsValue: number
    alertThresholds: Record<string, number>
    categories: WarehouseCategory[]
    alertCount: number
}>

/**
 * useStockMgmt - 深度重构后的库存管理 Hook 情况情况总量针对。
 * 职责：聚合多个核心查询，处理过滤器状态，并提供事务性维护操作。
 */
export function useStockMgmt(feedback?: Pick<WarehouseUiFeedback, 'success'>) {
    const ui = useMemo(
        () => feedback ?? createWarehouseUiFeedback(),
        [feedback],
    )
    const queryClient = useQueryClient()
    const { allowsAction } = useNonBlockingPermissionActions()
    const { t } = useLanguage()
    
    // 【归一化查询】：并行获取所有依赖数据情况情况总量针对。
    const inventoryQuery = useQuery({
        queryKey: warehouseQueryKeys.inventoryList(),
        queryFn: () => InventoryCoreService.getInventoryList()
    })

    const valuationQuery = useQuery({
        queryKey: warehouseQueryKeys.inventoryValuation(),
        queryFn: () => InventoryCoreService.getInventoryValuation()
    })

    const alertSummaryQuery = useQuery({
        queryKey: warehouseQueryKeys.inventoryAlertSummary(),
        queryFn: () => InventoryCoreService.getAlertSummary()
    })

    const thresholdsQuery = useQuery({
        queryKey: warehouseQueryKeys.alertThresholds(),
        queryFn: () => InventoryMaintenanceService.getAlertThresholds()
    })

    const categoriesQuery = useQuery({
        queryKey: warehouseQueryKeys.categoryList(),
        queryFn: () => WarehouseCategoryCoreService.getCategoryList()
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
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryList() })
            ui.success(t('warehouse.stock.toast.reconcileSuccess'))
            setReconcileConfirmOpen(false)
        },
        onError: (err) => failLoudly(err, 'StockMgmt.onConfirmReconcile')
    })

    const setThresholdMutation = useMutation({
        mutationFn: (params: { id: string, value: number }) =>
            InventoryMaintenanceService.setAlertThreshold(params.id, params.value),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.alertThresholds() })
            ui.success(t('warehouse.stock.toast.thresholdUpdated', {
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

    const readResource = useMemo<StockMgmtReadResource>(() => {
        const inventoryFailure = resolveQueryFailure({
            data: inventoryQuery.data,
            error: inventoryQuery.error,
            isPending: inventoryQuery.isPending,
            scope: 'useStockMgmt.inventory',
            missingMessage: '[CRITICAL] Inventory physical data missing after load',
            failureMessage: '[CRITICAL] Inventory physical query failed',
        })
        if (inventoryFailure) {
            return {
                status: 'error',
                error: inventoryFailure.error,
                scope: inventoryFailure.scope,
            }
        }

        const thresholdsFailure = resolveQueryFailure({
            data: thresholdsQuery.data,
            error: thresholdsQuery.error,
            isPending: thresholdsQuery.isPending,
            scope: 'useStockMgmt.alertThresholds',
            missingMessage: '[CRITICAL] Inventory security data missing after load',
            failureMessage: '[CRITICAL] Inventory security query failed',
        })
        if (thresholdsFailure) {
            return {
                status: 'error',
                error: thresholdsFailure.error,
                scope: thresholdsFailure.scope,
            }
        }

        const categoriesFailure = resolveQueryFailure({
            data: categoriesQuery.data,
            error: categoriesQuery.error,
            isPending: categoriesQuery.isPending,
            scope: 'useStockMgmt.categories',
            missingMessage: '[CRITICAL] Warehouse topology data missing after load',
            failureMessage: '[CRITICAL] Warehouse topology query failed',
        })
        if (categoriesFailure) {
            return {
                status: 'error',
                error: categoriesFailure.error,
                scope: categoriesFailure.scope,
            }
        }

        const alertSummaryFailure = resolveQueryFailure({
            data: alertSummaryQuery.data,
            error: alertSummaryQuery.error,
            isPending: alertSummaryQuery.isPending,
            scope: 'useStockMgmt.alertSummary',
            missingMessage: '[CRITICAL] Inventory alert summary missing after load',
            failureMessage: '[CRITICAL] Inventory alert summary query failed',
        })
        if (alertSummaryFailure) {
            return {
                status: 'error',
                error: alertSummaryFailure.error,
                scope: alertSummaryFailure.scope,
            }
        }

        if (valuationQuery.error) {
            return {
                status: 'error',
                error: valuationQuery.error instanceof Error ? valuationQuery.error : new Error('[CRITICAL] Inventory valuation query failed'),
                scope: 'useStockMgmt.totalAssetsValue',
            }
        }

        if (
            inventoryQuery.isPending ||
            thresholdsQuery.isPending ||
            categoriesQuery.isPending ||
            valuationQuery.isPending ||
            alertSummaryQuery.isPending
        ) {
            return { status: 'loading' }
        }

        const totalAssetsValue = valuationQuery.data
        if (totalAssetsValue === undefined || totalAssetsValue === null) {
            return {
                status: 'error',
                error: new Error('[CRITICAL] Inventory valuation missing after load'),
                scope: 'useStockMgmt.totalAssetsValue',
            }
        }

        const inventory = inventoryQuery.data as InventoryView[]
        const alertThresholds = thresholdsQuery.data as Record<string, number>
        const categories = categoriesQuery.data as WarehouseCategory[]
        const alertCount = alertSummaryQuery.data?.alertCount
        if (alertCount === undefined) {
            return {
                status: 'error',
                error: new Error('[CRITICAL] Inventory alert count missing after load'),
                scope: 'useStockMgmt.alertSummary',
            }
        }

        const materialTotalStock = inventory.reduce<Record<string, number>>((totals, item) => {
            totals[item.materialId] = (totals[item.materialId] || 0) + item.quantity
            return totals
        }, {})

        const filteredInventory = inventory.filter((item) =>
            item.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.materialCode.toLowerCase().includes(searchTerm.toLowerCase())
        )

        const groupedInventory = categories.reduce<Record<string, InventoryView[]>>((groups, cat) => {
            groups[cat.code] = []
            return groups
        }, {})

        filteredInventory.forEach((item) => {
            let catCode = (item.categoryCode || 'MATERIAL').trim()
            if (!categories.some((category) => category.code === catCode)) catCode = 'MATERIAL'
            if (!groupedInventory[catCode]) groupedInventory[catCode] = []
            groupedInventory[catCode].push(item)
        })

        return {
            status: 'ready',
            groupedInventory,
            materialTotalStock,
            totalAssetsValue,
            alertThresholds,
            categories,
            alertCount,
        }
    }, [
        alertSummaryQuery.data,
        alertSummaryQuery.error,
        alertSummaryQuery.isPending,
        categoriesQuery.data,
        categoriesQuery.error,
        categoriesQuery.isPending,
        inventoryQuery.data,
        inventoryQuery.error,
        inventoryQuery.isPending,
        searchTerm,
        thresholdsQuery.data,
        thresholdsQuery.error,
        thresholdsQuery.isPending,
        valuationQuery.data,
        valuationQuery.error,
        valuationQuery.isPending,
    ])

    useEffect(() => {
        if (readResource.status !== 'error') {
            return
        }

        logger.error(`Failed to load stock management resources: ${readResource.scope}`, readResource.error)
        failLoudly(readResource.error, readResource.scope)
    }, [readResource])

    const groupedInventory = readResource.status === 'ready' ? readResource.groupedInventory : {}
    const materialTotalStock = readResource.status === 'ready' ? readResource.materialTotalStock : {}
    const totalAssetsValue = readResource.status === 'ready' ? readResource.totalAssetsValue : 0
    const alertThresholds = readResource.status === 'ready' ? readResource.alertThresholds : {}
    const categories = readResource.status === 'ready' ? readResource.categories : []
    const alertCount = readResource.status === 'ready' ? readResource.alertCount : 0

    return {
        readResource,
        // Data states
        groupedInventory,
        materialTotalStock,
        totalAssetsValue,
        alertThresholds,
        categories,
        loading: readResource.status === 'loading',
        error: readResource.status === 'error' ? readResource.error : null,
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
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryList() })
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.alertThresholds() })
        },
        retryRead: async () => {
            await Promise.all([
                inventoryQuery.refetch(),
                valuationQuery.refetch(),
                alertSummaryQuery.refetch(),
                thresholdsQuery.refetch(),
                categoriesQuery.refetch(),
            ])
        },
    }
}
