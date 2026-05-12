import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { type InventoryThresholdRule } from '../material-thresholds/data/schema'
import { InventoryThresholdService } from '../material-thresholds/services/inventory-threshold-service'
import { WarehouseCategoryCoreService } from '../category'
import type { WarehouseCategory } from '../category/services/warehouse-category-core-service'
import {
    InventoryCoreService,
    type InventoryAlertSummary,
    type InventoryView,
} from '../inventory'
import { warehouseQueryKeys } from '../query-keys'
import { buildStockMgmtReadyData, type StockMgmtReadyData } from '../utils/stock-mgmt-read-model'
import { useStockMgmtActions } from './use-stock-mgmt-actions'
import { createWarehouseUiFeedback, type WarehouseUiFeedback } from './warehouse-ui-feedback'

const logger = createLogger('useStockMgmt')

type StockMgmtReadResource = CompositeReadResource<StockMgmtReadyData>

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

    const [searchTerm, setSearchTerm] = useState('')
    const [hideZeroStockMap, setHideZeroStockMap] = useState<Record<string, boolean>>({})

    const {
        configDialogOpen,
        selectedMaterial,
        selectedThresholdRule,
        selectedMaterialOptions,
        canManageThresholdRule,
        reconcileConfirmOpen,
        isReconciling,
        isSavingThresholdRule,
        handleHardReconcile,
        onConfirmReconcile,
        handleSaveThresholdRule,
        handleThresholdDialogOpenChange,
        openThresholdConfig,
        handleReconcileConfirmOpenChange,
    } = useStockMgmtActions({
        thresholdRules: thresholdRulesQuery.data,
        queryClient,
        allowsAction,
        showSuccess: ui.success,
        getReconcileSuccessMessage: () => t('warehouse.stock.toast.reconcileSuccess'),
        getThresholdRuleUpdatedMessage: (materialName) =>
            t('warehouse.stock.toast.thresholdRuleUpdated', { name: materialName }),
    })

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
        const categories = categoriesQuery.data as WarehouseCategory[]
        const alertSummary = alertSummaryQuery.data as InventoryAlertSummary | undefined
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

        return {
            status: 'ready',
            ...buildStockMgmtReadyData({
                inventory,
                thresholdRules,
                categories,
                alertSummary,
                totalAssetsValue,
                searchTerm,
            }),
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
    const materialThresholdMap = readResource.status === 'ready' ? readResource.materialThresholdMap : {}
    const categories = readResource.status === 'ready' ? readResource.categories : []
    const alertCount = readResource.status === 'ready' ? readResource.alertCount : 0
    const materialAlertCount = readResource.status === 'ready' ? readResource.materialAlertCount : 0
    const bomAlertCount = readResource.status === 'ready' ? readResource.bomAlertCount : 0

    return {
        readResource,
        // Data states
        stockData: {
            groupedInventory,
            materialTotalStock,
            totalAssetsValue,
            materialThresholdMap,
            categories,
            alertCount,
            materialAlertCount,
            bomAlertCount,
        },

        // UI & Filter states
        filters: {
            searchTerm,
            setSearchTerm,
            hideZeroStockMap,
            setHideZeroStockMap,
        },

        // Dialog states
        thresholdDialog: {
            open: configDialogOpen,
            selectedMaterial,
            selectedThresholdRule,
            selectedMaterialOptions,
            canManageThresholdRule,
            isSubmitting: isSavingThresholdRule,
            onOpenChange: handleThresholdDialogOpenChange,
            onSubmit: handleSaveThresholdRule,
            openForMaterial: openThresholdConfig,
        },
        reconcileDialog: {
            open: reconcileConfirmOpen,
            isSubmitting: isReconciling,
            onOpenChange: handleReconcileConfirmOpenChange,
            onConfirm: onConfirmReconcile,
            requestOpen: handleHardReconcile,
        },

        // Handlers
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
