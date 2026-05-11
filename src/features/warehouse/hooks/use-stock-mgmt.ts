import { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import {
    type InventoryThresholdRule,
    type InventoryThresholdRuleWritePayload,
} from '../material-thresholds/data/schema'
import { InventoryThresholdService } from '../material-thresholds/services/inventory-threshold-service'
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
    thresholdRules: InventoryThresholdRule[]
    categories: WarehouseCategory[]
    alertCount: number
    materialAlertCount: number
    bomAlertCount: number
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

    const thresholdRulesQuery = useQuery({
        queryKey: warehouseQueryKeys.thresholdRules(),
        queryFn: () => InventoryThresholdService.listRules()
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
    const [selectedMaterial, setSelectedMaterial] = useState<{
        id: string
        name: string
        code: string
        spec: string
        uom: string
    } | null>(null)
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

    const saveThresholdRuleMutation = useMutation({
        mutationFn: async (payload: InventoryThresholdRuleWritePayload) => {
            if (!selectedMaterial) {
                throw new Error('[VALIDATION] stock threshold target is missing')
            }

            const existingRule = thresholdRulesQuery.data?.find(
                (rule) => rule.targetType === 'MATERIAL' && rule.materialId === selectedMaterial.id
            )

            if (existingRule) {
                return InventoryThresholdService.updateRule(existingRule.id, payload)
            }

            return InventoryThresholdService.createRule(payload)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.thresholdRules() })
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.alertThresholds() })
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryAlertSummary() })
            ui.success(t('warehouse.stock.toast.thresholdRuleUpdated', {
                name: selectedMaterial?.name || '物料',
            }))
            setConfigDialogOpen(false)
            setSelectedMaterial(null)
        },
        onError: (err) => failLoudly(err, 'StockMgmt.handleSaveThresholdRule')
    })

    // Business Logic Handlers
    const handleHardReconcile = () => {
        if (!allowsAction('action_warehouse_reconcile')) return
        setReconcileConfirmOpen(true)
    }

    const onConfirmReconcile = async () => {
        await reconcileMutation.mutateAsync()
    }

    const handleSaveThresholdRule = async (payload: InventoryThresholdRuleWritePayload) => {
        if (!selectedMaterial) return
        if (!allowsAction('action_warehouse_category_manage')) return

        const existingRule = thresholdRulesQuery.data?.find(
            (rule) => rule.targetType === 'MATERIAL' && rule.materialId === selectedMaterial.id
        )

        if (!existingRule && payload.thresholdQty <= 0) {
            setConfigDialogOpen(false)
            setSelectedMaterial(null)
            return
        }

        await saveThresholdRuleMutation.mutateAsync(payload)
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

        const thresholdRulesFailure = resolveQueryFailure({
            data: thresholdRulesQuery.data,
            error: thresholdRulesQuery.error,
            isPending: thresholdRulesQuery.isPending,
            scope: 'useStockMgmt.thresholdRules',
            missingMessage: '[CRITICAL] Inventory threshold rules missing after load',
            failureMessage: '[CRITICAL] Inventory threshold rules query failed',
        })
        if (thresholdRulesFailure) {
            return {
                status: 'error',
                error: thresholdRulesFailure.error,
                scope: thresholdRulesFailure.scope,
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
            thresholdRulesQuery.isPending ||
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
        const thresholdRules = thresholdRulesQuery.data as InventoryThresholdRule[]
        const alertThresholds = thresholdRules.reduce<Record<string, number>>((acc, rule) => {
            if (rule.targetType !== 'MATERIAL' || !rule.enabled || !rule.materialId) {
                return acc
            }

            acc[rule.materialId] = rule.thresholdQty
            return acc
        }, {})
        const categories = categoriesQuery.data as WarehouseCategory[]
        const alertSummary = alertSummaryQuery.data
        if (
            alertSummary?.alertCount === undefined ||
            alertSummary.materialAlertCount === undefined ||
            alertSummary.bomAlertCount === undefined
        ) {
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
            thresholdRules,
            categories,
            alertCount: alertSummary.alertCount,
            materialAlertCount: alertSummary.materialAlertCount,
            bomAlertCount: alertSummary.bomAlertCount,
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
        thresholdRulesQuery.data,
        thresholdRulesQuery.error,
        thresholdRulesQuery.isPending,
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
    const thresholdRules = readResource.status === 'ready' ? readResource.thresholdRules : []
    const categories = readResource.status === 'ready' ? readResource.categories : []
    const alertCount = readResource.status === 'ready' ? readResource.alertCount : 0
    const materialAlertCount = readResource.status === 'ready' ? readResource.materialAlertCount : 0
    const bomAlertCount = readResource.status === 'ready' ? readResource.bomAlertCount : 0
    const selectedThresholdRule = selectedMaterial
        ? thresholdRules.find(
            (rule) => rule.targetType === 'MATERIAL' && rule.materialId === selectedMaterial.id
        ) ?? null
        : null
    const selectedMaterialOptions = selectedMaterial ? [
        {
            id: selectedMaterial.id,
            code: selectedMaterial.code,
            name: selectedMaterial.name,
            category: '',
            spec: selectedMaterial.spec,
            uom: selectedMaterial.uom,
            status: 'Active',
        }
    ] : []
    const canManageThresholdRule = allowsAction('action_warehouse_category_manage')

    return {
        readResource,
        // Data states
        groupedInventory,
        materialTotalStock,
        totalAssetsValue,
        alertThresholds,
        thresholdRules,
        categories,
        loading: readResource.status === 'loading',
        error: readResource.status === 'error' ? readResource.error : null,
        alertCount,
        materialAlertCount,
        bomAlertCount,

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
        selectedThresholdRule,
        selectedMaterialOptions,
        canManageThresholdRule,
        reconcileConfirmOpen,
        setReconcileConfirmOpen,
        isReconciling: reconcileMutation.isPending,
        isSavingThresholdRule: saveThresholdRuleMutation.isPending,

        // Handlers
        handleHardReconcile,
        onConfirmReconcile,
        handleSaveThresholdRule,
        refreshData: () => {
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.inventoryList() })
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.thresholdRules() })
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.alertThresholds() })
        },
        retryRead: async () => {
            await Promise.all([
                inventoryQuery.refetch(),
                valuationQuery.refetch(),
                alertSummaryQuery.refetch(),
                thresholdRulesQuery.refetch(),
                categoriesQuery.refetch(),
            ])
        },
    }
}
