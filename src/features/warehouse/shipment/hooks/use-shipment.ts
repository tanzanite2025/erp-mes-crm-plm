'use client'

import { useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { getSalesOrderById, useGetSalesOrders } from '@/features/trading/sales'
import { auditUtils } from '@/lib/audit-utils'
import { resolveInventoryErrorTip } from '../../constants/inventory-error-codes'
import { type MasterDataSearchResult } from '../../inventory'
import { InventoryMaintenanceService } from '../../services/inventory-maintenance-service'
import {
  filterWarehouseCategoriesByScene,
  getDefaultWarehouseCategoryCode,
} from '../../utils/warehouse-category-config'
import { ShipmentTransactionService } from '../services/shipment-transaction-service'
import { useShipmentBootstrap } from './use-shipment-bootstrap'
import { useShipmentFormState } from './use-shipment-form-state'
import { useShipmentInventoryContext } from './use-shipment-inventory-context'
import { useShipmentSearch } from './use-shipment-search'

export function useShipment() {
  const { locale, t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const shipmentSearch = useShipmentSearch()
  const shipmentBootstrap = useShipmentBootstrap()
  const shipmentForm = useShipmentFormState()
  const shipmentInventoryContext = useShipmentInventoryContext({
    selectedItem: shipmentForm.selectedItem,
    sourceCategory: shipmentForm.formData.sourceCategory,
  })

  const salesOrdersQuery = useGetSalesOrders()
  const salesOrdersData = salesOrdersQuery.data?.items
  if (!salesOrdersData && !salesOrdersQuery.isLoading && salesOrdersQuery.isSuccess) {
    throw new Error('[CRITICAL] Sales orders data missing in UseShipment.salesOrders')
  }
  const salesOrders = useMemo(() => salesOrdersData ?? [], [salesOrdersData])

  const openShipmentForm = useCallback((item: MasterDataSearchResult) => {
    if (!allowsAction('action_warehouse_shipment_record')) return
    shipmentForm.openShipmentForm(item)
    const allowedCategories = filterWarehouseCategoriesByScene(shipmentBootstrap.warehouseCategories, 'shipment')
    const defaultSourceCategory =
      getDefaultWarehouseCategoryCode(allowedCategories, 'shipment', item.category) ||
      allowedCategories[0]?.code ||
      ''
    shipmentForm.setFormData({ sourceCategory: defaultSourceCategory })
  }, [allowsAction, shipmentBootstrap.warehouseCategories, shipmentForm])

  const resolveSalesOrderBinding = useCallback(async (
    selectedItem: MasterDataSearchResult,
    orderNo: string,
    currentSalesOrderId: string,
    currentSalesOrderLineId: number,
  ) => {
    if (!orderNo) {
      return {
        salesOrderId: currentSalesOrderId,
        salesOrderLineId: currentSalesOrderLineId,
      }
    }

    const selectedOrder = salesOrders.find((order) => order.orderNo === orderNo)
    if (!selectedOrder?.id) {
      return {
        salesOrderId: currentSalesOrderId,
        salesOrderLineId: currentSalesOrderLineId,
      }
    }

    const detail = await getSalesOrderById(selectedOrder.id)
    if (!detail.lines) {
      throw new Error(`[CRITICAL] Order ${selectedOrder.orderNo} lines missing from backend detail`)
    }

    const matchedLine = detail.lines.find((line) => {
      return line.productId === selectedItem.id || line.productCode === selectedItem.code
    })

    return {
      salesOrderId: selectedOrder.id,
      salesOrderLineId: matchedLine?.id || 0,
    }
  }, [salesOrders])

  const submitShipment = useCallback(async (status: 'DRAFT' | 'COMMITTED') => {
    if (!allowsAction('action_warehouse_shipment_record')) return

    const selectedItem = shipmentForm.selectedItem
    const formData = shipmentForm.formData
    if (!selectedItem) return

    if (formData.quantity <= 0) {
      toast.error(t('warehouse.shipment.toast.quantityInvalid'))
      return
    }

    if (status === 'COMMITTED' && formData.quantity > shipmentInventoryContext.categoryStock) {
      toast.warning(
        t('warehouse.shipment.toast.insufficientStock', {
          count: shipmentInventoryContext.categoryStock,
          uom: selectedItem.uom,
        }),
      )
    }

    try {
      const binding = await resolveSalesOrderBinding(
        selectedItem,
        formData.orderNo,
        formData.salesOrderId,
        formData.salesOrderLineId,
      )

      await ShipmentTransactionService.recordShipment({
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
        status,
        version: 1,
      })

      toast.success(
        status === 'DRAFT'
          ? t('warehouse.shipment.toast.savedDraft')
          : t('warehouse.shipment.toast.commitSuccess'),
      )
      shipmentForm.closeShipmentForm()
      await shipmentBootstrap.refreshData()
    } catch (error) {
      toast.error(resolveInventoryErrorTip(error, locale))
    }
  }, [
    allowsAction,
    locale,
    resolveSalesOrderBinding,
    shipmentBootstrap,
    shipmentForm,
    shipmentInventoryContext.categoryStock,
    t,
  ])

  const commitDraft = useCallback(async (id: string, name: string) => {
    if (!allowsAction('action_warehouse_shipment_commit')) return

    const record = shipmentBootstrap.history.find((entry) => entry.id === id)
    if (!record) {
      toast.error(t('warehouse.shipment.toast.notFound'))
      return
    }

    if (!confirm(t('warehouse.shipment.toast.commitConfirm', { name }))) {
      return
    }

    try {
      await ShipmentTransactionService.commitShipment(id)
      toast.success(t('warehouse.shipment.toast.commitRecorded'))
      await shipmentBootstrap.refreshData()
    } catch (error) {
      toast.error(resolveInventoryErrorTip(error, locale))
    }
  }, [allowsAction, locale, shipmentBootstrap, t])

  const removeRecord = useCallback(async (
    id: string,
    name: string,
    quantity: number,
    status: string,
    approvalId?: string,
  ) => {
    if (!allowsAction('action_warehouse_shipment_void')) return

    const record = shipmentBootstrap.history.find((entry) => entry.id === id)
    if (!record) return

    const dialogMsg = status === 'COMMITTED'
      ? t('warehouse.shipment.toast.voidConfirmCommitted', { name, quantity })
      : t('warehouse.shipment.toast.voidConfirmDraft')

    if (!approvalId && !confirm(dialogMsg)) return

    try {
      await InventoryMaintenanceService.deleteShipmentRecord(id, approvalId)
      toast.success(
        status === 'COMMITTED'
          ? t('warehouse.shipment.toast.voidSuccess')
          : t('warehouse.shipment.toast.actionSuccess'),
      )
      await shipmentBootstrap.refreshData()
    } catch (error) {
      toast.error(resolveInventoryErrorTip(error, locale))
    }
  }, [allowsAction, locale, shipmentBootstrap, t])

  return {
    searchQuery: shipmentSearch.searchQuery,
    setSearchQuery: shipmentSearch.setSearchQuery,
    searchResults: shipmentSearch.searchResults,
    history: shipmentBootstrap.history,
    error: shipmentBootstrap.error,
    isSearching: shipmentSearch.isSearching,
    selectedItem: shipmentForm.selectedItem,
    isShipmentOpen: shipmentForm.isShipmentOpen,
    setIsShipmentOpen: shipmentForm.setIsShipmentOpen,
    warehouseCategories: shipmentBootstrap.warehouseCategories,
    masterDataMap: shipmentBootstrap.masterDataMap,
    activeTab: shipmentForm.activeTab,
    setActiveTab: shipmentForm.setActiveTab,
    formData: shipmentForm.formData,
    setFormData: shipmentForm.setFormData,
    openShipmentForm,
    submitShipment,
    commitDraft,
    removeRecord,
    fillMaxQuantity: shipmentForm.fillMaxQuantity,
    categoryStock: shipmentInventoryContext.categoryStock,
    inventoryBreakdown: shipmentInventoryContext.inventoryBreakdown,
    alertThresholds: shipmentBootstrap.alertThresholds,
    salesOrders,
  }
}
