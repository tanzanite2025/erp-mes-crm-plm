'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { auditUtils } from '@/lib/audit-utils'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { type SalesOrder } from '@/features/trading/data/schema'
import { getSalesOrderById, useGetSalesOrders } from '@/features/trading/sales'
import { shippingManagementQueryKeys } from '@/features/trading/shipping-management/query-keys'
import { type MasterDataSearchResult } from '../../inventory'
import { warehouseQueryKeys } from '../../query-keys'
import { InventoryMaintenanceService } from '../../services/inventory-maintenance-service'
import {
  filterWarehouseCategoriesByScene,
  getDefaultWarehouseCategoryCode,
} from '../../utils/warehouse-category-config'
import { type ShipmentDemand } from '../data/schema'
import { ShipmentTransactionService } from '../services/shipment-transaction-service'
import {
  createShipmentUiFeedback,
  type ShipmentUiFeedback,
} from './shipment-ui-feedback'
import {
  useShipmentBootstrap,
  type ShipmentBootstrapResource,
} from './use-shipment-bootstrap'
import { useShipmentFormState } from './use-shipment-form-state'
import { useShipmentInventoryContext } from './use-shipment-inventory-context'
import { useShipmentSearch } from './use-shipment-search'

type ShipmentBootstrapReady = Extract<
  ShipmentBootstrapResource,
  { status: 'ready' }
>

type ShipmentReadResource = CompositeReadResource<{
  history: ShipmentBootstrapReady['history']
  shipmentDemands: ShipmentBootstrapReady['shipmentDemands']
  warehouseCategories: ShipmentBootstrapReady['warehouseCategories']
  masterDataMap: ShipmentBootstrapReady['masterDataMap']
  materialThresholdMap: ShipmentBootstrapReady['materialThresholdMap']
  salesOrders: SalesOrder[]
}>

export function useShipment(feedback?: ShipmentUiFeedback) {
  const { locale, t } = useLanguage()
  const ui = useMemo(
    () => feedback ?? createShipmentUiFeedback(locale),
    [feedback, locale]
  )
  const queryClient = useQueryClient()
  const { allowsAction } = usePermissionActions()
  const shipmentSearch = useShipmentSearch(ui)
  const shipmentBootstrap = useShipmentBootstrap(ui)
  const shipmentForm = useShipmentFormState()
  const shipmentInventoryContext = useShipmentInventoryContext({
    selectedItem: shipmentForm.selectedItem,
    sourceCategory: shipmentForm.formData.sourceCategory,
  })

  const salesOrdersQuery = useGetSalesOrders()
  const salesOrdersData = salesOrdersQuery.data?.items

  const readResource = useMemo<ShipmentReadResource>(() => {
    if (shipmentBootstrap.readResource.status !== 'ready') {
      return shipmentBootstrap.readResource
    }

    const salesOrdersFailure = resolveQueryFailure({
      data: salesOrdersData,
      error: salesOrdersQuery.error,
      isPending: salesOrdersQuery.isPending,
      scope: 'useShipment.salesOrders',
      missingMessage:
        '[CRITICAL] Sales orders data missing in useShipment.salesOrders',
      failureMessage:
        '[CRITICAL] Sales orders query failed in useShipment.salesOrders',
    })
    if (salesOrdersFailure) {
      return {
        status: 'error',
        error: salesOrdersFailure.error,
        scope: salesOrdersFailure.scope,
      }
    }

    if (salesOrdersQuery.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      history: shipmentBootstrap.readResource.history,
      shipmentDemands: shipmentBootstrap.readResource.shipmentDemands,
      warehouseCategories: shipmentBootstrap.readResource.warehouseCategories,
      masterDataMap: shipmentBootstrap.readResource.masterDataMap,
      materialThresholdMap: shipmentBootstrap.readResource.materialThresholdMap,
      salesOrders: salesOrdersData as SalesOrder[],
    }
  }, [
    salesOrdersData,
    salesOrdersQuery.error,
    salesOrdersQuery.isPending,
    shipmentBootstrap.readResource,
  ])

  useEffect(() => {
    if (
      readResource.status !== 'error' ||
      readResource.scope !== 'useShipment.salesOrders'
    ) {
      return
    }

    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const inventoryContextResource = shipmentInventoryContext.readResource

  const invalidateWarehouseReads = useCallback(
    async (materialId?: string, sourceCategory?: string) => {
      const invalidations = [
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.shipmentHistory(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.shipmentDemands(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inventoryList(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inventoryValuation(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.inventoryAlertSummary(),
        }),
        queryClient.invalidateQueries({
          queryKey: warehouseQueryKeys.materialThresholdMap(),
        }),
        queryClient.invalidateQueries({
          queryKey: shippingManagementQueryKeys.vehicleMatchItems(),
        }),
      ]

      if (materialId) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: warehouseQueryKeys.inventoryBreakdown(materialId),
          })
        )
      }

      if (materialId && sourceCategory) {
        invalidations.push(
          queryClient.invalidateQueries({
            queryKey: warehouseQueryKeys.categoryStock(
              materialId,
              sourceCategory
            ),
          })
        )
      }

      await Promise.all(invalidations)
    },
    [queryClient]
  )

  const openShipmentForm = useCallback(
    (item: MasterDataSearchResult) => {
      if (!allowsAction('action_warehouse_shipment_record')) return
      if (readResource.status !== 'ready') return
      shipmentForm.openShipmentForm(item, 'dispatch')
      const allowedCategories = filterWarehouseCategoriesByScene(
        readResource.warehouseCategories,
        'shipment'
      )
      const defaultSourceCategory =
        getDefaultWarehouseCategoryCode(
          allowedCategories,
          'shipment',
          item.category
        ) ||
        allowedCategories[0]?.code ||
        ''
      shipmentForm.setFormData({ sourceCategory: defaultSourceCategory })
    },
    [allowsAction, readResource, shipmentForm]
  )

  const openVirtualLockForm = useCallback(
    (demand: ShipmentDemand) => {
      if (!allowsAction('action_warehouse_shipment_record')) return
      if (readResource.status !== 'ready') return

      const item: MasterDataSearchResult = {
        id: demand.materialId,
        name: demand.materialName || demand.materialCode,
        code: demand.materialCode,
        spec: demand.materialSpec,
        uom: demand.uom,
        category: 'FINISHED',
        sourceModule: 'PRODUCT',
        stock: demand.availableQty,
      }

      shipmentForm.openShipmentForm(item, 'virtualLock')

      const allowedCategories = filterWarehouseCategoriesByScene(
        readResource.warehouseCategories,
        'shipment'
      ).filter((category) => category.value !== 'SHIPPING_VIRTUAL')
      const firstAvailableStock = demand.stockBreakdown.find(
        (stock) => stock.quantity > 0
      )
      const defaultSourceCategory =
        firstAvailableStock?.categoryCode ||
        getDefaultWarehouseCategoryCode(
          allowedCategories,
          'shipment',
          item.category
        ) ||
        allowedCategories[0]?.code ||
        ''
      const defaultQuantity = Math.min(
        demand.remainingToPrepare,
        firstAvailableStock?.quantity ?? demand.remainingToPrepare
      )

      shipmentForm.setFormData({
        sourceCategory: defaultSourceCategory,
        batchNo: firstAvailableStock?.batchNo ?? '',
        quantity: defaultQuantity,
        orderNo: demand.orderNo,
        salesOrderId: demand.salesOrderId,
        salesOrderLineId: demand.salesOrderLineId,
        remarks: '',
      })
    },
    [allowsAction, readResource, shipmentForm]
  )

  const resolveSalesOrderBinding = useCallback(
    async (
      selectedItem: MasterDataSearchResult,
      orderNo: string,
      currentSalesOrderId: string,
      currentSalesOrderLineId: number
    ) => {
      if (!orderNo) {
        return {
          salesOrderId: currentSalesOrderId,
          salesOrderLineId: currentSalesOrderLineId,
        }
      }

      const salesOrders =
        readResource.status === 'ready' ? readResource.salesOrders : []
      const selectedOrder = salesOrders.find(
        (order) => order.orderNo === orderNo
      )
      if (!selectedOrder?.id) {
        return {
          salesOrderId: currentSalesOrderId,
          salesOrderLineId: currentSalesOrderLineId,
        }
      }

      const detail = await getSalesOrderById(selectedOrder.id)
      if (!detail.lines) {
        throw new Error(
          `[CRITICAL] Order ${selectedOrder.orderNo} lines missing from backend detail`
        )
      }

      const matchedLine = detail.lines.find((line) => {
        return (
          line.productId === selectedItem.id ||
          line.productCode === selectedItem.code
        )
      })

      return {
        salesOrderId: selectedOrder.id,
        salesOrderLineId: matchedLine?.id || 0,
      }
    },
    [readResource]
  )

  const submitShipment = useCallback(
    async (status: 'DRAFT' | 'COMMITTED') => {
      if (!allowsAction('action_warehouse_shipment_record')) return

      const selectedItem = shipmentForm.selectedItem
      const formData = shipmentForm.formData
      if (!selectedItem) return

      if (formData.quantity <= 0) {
        ui.error(t('warehouse.shipment.toast.quantityInvalid'))
        return
      }

      if (inventoryContextResource.status !== 'ready') {
        ui.error(t('warehouse.errors.queryFailed'))
        return
      }

      const categoryStock = inventoryContextResource.categoryStock

      if (status === 'COMMITTED' && formData.quantity > categoryStock) {
        ui.warning(
          t('warehouse.shipment.toast.insufficientStock', {
            count: categoryStock,
            uom: selectedItem.uom,
          })
        )
      }

      try {
        if (shipmentForm.formMode === 'virtualLock') {
          if (!formData.salesOrderId || !formData.salesOrderLineId) {
            ui.error('订单行信息缺失，无法转入虚拟发货仓')
            return
          }

          await ShipmentTransactionService.prepareVirtualShipment({
            salesOrderId: formData.salesOrderId,
            salesOrderLineId: formData.salesOrderLineId,
            quantity: formData.quantity,
            sourceCategory: formData.sourceCategory,
            batchNo: formData.batchNo,
            shipmentDate: formData.shipmentDate,
            operator: auditUtils.getOperatorInfo().label,
            remarks: formData.remarks,
          })

          ui.success('已转入虚拟发货仓，配车页面会同步读取')
          shipmentForm.closeShipmentForm()
          await invalidateWarehouseReads(
            selectedItem.id,
            formData.sourceCategory
          )
          return
        }

        const binding = await resolveSalesOrderBinding(
          selectedItem,
          formData.orderNo,
          formData.salesOrderId,
          formData.salesOrderLineId
        )

        const created = await ShipmentTransactionService.recordShipment({
          materialId: selectedItem.id,
          materialName: selectedItem.name,
          materialCode: selectedItem.code,
          salesOrderId: binding.salesOrderId || undefined,
          salesOrderLineId: binding.salesOrderLineId || undefined,
          quantity: formData.quantity,
          cogs: 0,
          batchNo: formData.batchNo,
          orderNo: formData.orderNo,
          shipmentDate: formData.shipmentDate,
          operator: auditUtils.getOperatorInfo().label,
          remarks: formData.remarks,
          sourceCategory: formData.sourceCategory,
          status: 'DRAFT',
        })

        if (status === 'COMMITTED') {
          await ShipmentTransactionService.commitShipment(created.id)
        }

        ui.success(
          status === 'DRAFT'
            ? t('warehouse.shipment.toast.savedDraft')
            : t('warehouse.shipment.toast.commitSuccess')
        )
        shipmentForm.closeShipmentForm()
        await invalidateWarehouseReads(selectedItem.id, formData.sourceCategory)
      } catch (error) {
        ui.error(ui.resolveError(error))
      }
    },
    [
      allowsAction,
      invalidateWarehouseReads,
      inventoryContextResource,
      resolveSalesOrderBinding,
      shipmentForm,
      t,
      ui,
    ]
  )

  const commitDraft = useCallback(
    async (id: string, name: string) => {
      if (!allowsAction('action_warehouse_shipment_commit')) return
      if (readResource.status !== 'ready') return

      const record = readResource.history.find((entry) => entry.id === id)
      if (!record) {
        ui.error(t('warehouse.shipment.toast.notFound'))
        return
      }

      if (!ui.confirm(t('warehouse.shipment.toast.commitConfirm', { name }))) {
        return
      }

      try {
        await ShipmentTransactionService.commitShipment(id)
        ui.success(t('warehouse.shipment.toast.commitRecorded'))
        await invalidateWarehouseReads(record.materialId, record.sourceCategory)
      } catch (error) {
        ui.error(ui.resolveError(error))
      }
    },
    [allowsAction, invalidateWarehouseReads, readResource, t, ui]
  )

  const removeRecord = useCallback(
    async (
      id: string,
      name: string,
      quantity: number,
      status: string,
      approvalId?: string
    ) => {
      if (!allowsAction('action_warehouse_shipment_void')) return
      if (readResource.status !== 'ready') return

      const record = readResource.history.find((entry) => entry.id === id)
      if (!record) return

      const dialogMsg =
        status === 'COMMITTED'
          ? t('warehouse.shipment.toast.voidConfirmCommitted', {
              name,
              quantity,
            })
          : t('warehouse.shipment.toast.voidConfirmDraft')

      if (!approvalId && !ui.confirm(dialogMsg)) return

      try {
        await InventoryMaintenanceService.deleteShipmentRecord(id, approvalId)
        ui.success(
          status === 'COMMITTED'
            ? t('warehouse.shipment.toast.voidSuccess')
            : t('warehouse.shipment.toast.actionSuccess')
        )
        await invalidateWarehouseReads(record.materialId, record.sourceCategory)
      } catch (error) {
        ui.error(ui.resolveError(error))
      }
    },
    [allowsAction, invalidateWarehouseReads, readResource, t, ui]
  )

  return {
    readResource,
    retryRead: async () => {
      await Promise.all([
        shipmentBootstrap.retryRead(),
        salesOrdersQuery.refetch(),
      ])
    },
    searchQuery: shipmentSearch.searchQuery,
    setSearchQuery: shipmentSearch.setSearchQuery,
    searchResource: shipmentSearch.searchResource,
    retrySearch: shipmentSearch.retrySearch,
    selectedItem: shipmentForm.selectedItem,
    formMode: shipmentForm.formMode,
    isShipmentOpen: shipmentForm.isShipmentOpen,
    setIsShipmentOpen: shipmentForm.setIsShipmentOpen,
    activeTab: shipmentForm.activeTab,
    setActiveTab: shipmentForm.setActiveTab,
    formData: shipmentForm.formData,
    setFormData: shipmentForm.setFormData,
    openShipmentForm,
    openVirtualLockForm,
    submitShipment,
    commitDraft,
    removeRecord,
    fillMaxQuantity: shipmentForm.fillMaxQuantity,
    inventoryContextResource,
    retryInventoryContext: shipmentInventoryContext.retryRead,
  }
}
