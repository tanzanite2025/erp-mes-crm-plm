'use client'

import { useCallback, useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { useGetSalesOrders, getSalesOrderById } from '@/features/trading/sales'
import { auditUtils } from '@/lib/audit-utils'
import { resolveInventoryErrorTip } from '../constants/inventory-error-codes'
import { inventoryService, type MasterDataSearchResult, type ShipmentRecord } from '../services/inventory-service'
import { useDeltaTracker } from '@/hooks/use-delta-tracker'

interface WarehouseCategoryOption {
  value: string
  label: string
}

const DEFAULT_FORM_DATA = {
  quantity: 1,
  batchNo: '',
  orderNo: '',
  salesOrderId: '',
  salesOrderLineId: 0,
  sourceCategory: '',
  shipmentDate: new Date().toISOString().slice(0, 10),
  remarks: '',
}

type ShipmentFormData = typeof DEFAULT_FORM_DATA
type ShipmentFormUpdater = Partial<ShipmentFormData> | ((current: ShipmentFormData) => Partial<ShipmentFormData>)

export function useShipment() {
  const { locale, t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<MasterDataSearchResult[]>([])
  const [history, setHistory] = useState<ShipmentRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MasterDataSearchResult | null>(null)
  const [isShipmentOpen, setIsShipmentOpen] = useState(false)
  const [warehouseCategories, setWarehouseCategories] = useState<WarehouseCategoryOption[]>([])
  const [alertThresholds, setAlertThresholds] = useState<Record<string, number>>({})
  const [masterDataMap, setMasterDataMap] = useState<Record<string, MasterDataSearchResult>>({})
  const [activeTab, setActiveTab] = useState('all')
  const [categoryStock, setCategoryStock] = useState<number>(0)
  const [inventoryBreakdown, setInventoryBreakdown] = useState<Record<string, number>>({})
  const [error, setError] = useState<unknown>(null)

  // 使用 SDRTS DeltaTracker 进行状态追踪
  const initialForm = useMemo(() => DEFAULT_FORM_DATA, [])
  const { data: formData } = useDeltaTracker(initialForm, isShipmentOpen)

  // 兼容性 Shim: 模拟 setFormData
  const setFormData = useCallback((updater: ShipmentFormUpdater) => {
    if (typeof updater === 'function') {
      const next = updater(formData)
      Object.assign(formData, next)
    } else {
      Object.assign(formData, updater)
    }
  }, [formData])

  const { data } = useGetSalesOrders()
  const salesOrders = data?.items || []

  const loadInitialData = useCallback(async () => {
    try {
      setError(null)
      const [recentHistory, categories, allMasterData, thresholds] = await Promise.all([
        inventoryService.getShipmentHistory(),
        Promise.resolve(dictionaryService.getOptions('WAREHOUSE_CATEGORY') as WarehouseCategoryOption[]),
        inventoryService.searchMasterData(''),
        inventoryService.getAlertThresholds(),
      ])
      setHistory(recentHistory)
      setWarehouseCategories(categories)
      setAlertThresholds(thresholds)

      const map: Record<string, MasterDataSearchResult> = {}
      allMasterData.forEach((item) => {
        map[item.id] = item
      })
      setMasterDataMap(map)
    } catch (loadError) {
      setError(loadError)
      toast.error(t('warehouse.errors.queryFailed'))
    }
  }, [t])

  useEffect(() => {
    void loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    if (selectedItem) {
      inventoryService.getInventoryBreakdown(selectedItem.id).then(setInventoryBreakdown)
    }
  }, [selectedItem])

  useEffect(() => {
    if (selectedItem && formData.sourceCategory) {
      inventoryService.getCategoryStock(selectedItem.id, formData.sourceCategory).then(setCategoryStock)
    }
  }, [selectedItem, formData.sourceCategory])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await inventoryService.searchMasterData(searchQuery)
      setSearchResults(results)
      if (results.length === 0) {
        toast.error(t('warehouse.shipment.toast.notFound'))
      }
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, t])

  useEffect(() => {
	if (!searchQuery.trim()) {
	  setSearchResults([])
	  return
	}
	const timer = setTimeout(() => {
	  void handleSearch()
	}, 300)
	return () => clearTimeout(timer)
  }, [handleSearch, searchQuery])

  const openShipmentForm = (item: MasterDataSearchResult) => {
    if (!allowsAction('action_warehouse_shipment_record')) return

    setSelectedItem(item)
    // 直接操作 Proxy 数据
    formData.sourceCategory = item.category || (item.sourceModule === 'PRODUCT' ? 'FINISHED' : 'MATERIAL')
    formData.batchNo = `S${new Date().toISOString().slice(2, 10).replace(/-/g, '')}`
    formData.quantity = 1
    formData.orderNo = ''
    formData.salesOrderId = ''
    formData.salesOrderLineId = 0
    formData.remarks = ''
    
    setIsShipmentOpen(true)
  }

  const submitShipment = async (status: 'DRAFT' | 'COMMITTED') => {
    if (!allowsAction('action_warehouse_shipment_record')) return
    if (!selectedItem) return
    if (formData.quantity <= 0) {
      toast.error(t('warehouse.shipment.toast.quantityInvalid'))
      return
    }

    if (status === 'COMMITTED' && formData.quantity > categoryStock) {
      toast.warning(
        t('warehouse.shipment.toast.insufficientStock', {
          count: categoryStock,
          uom: selectedItem.uom,
        })
      )
    }

    try {
      let salesOrderId = formData.salesOrderId
      let salesOrderLineId = formData.salesOrderLineId

      if (formData.orderNo) {
        const selectedOrder = salesOrders.find((order) => order.orderNo === formData.orderNo)
        if (selectedOrder?.id) {
          salesOrderId = selectedOrder.id
          const detail = await getSalesOrderById(selectedOrder.id)
          const matchedLine = (detail.lines || []).find((line) => {
            return line.productId === selectedItem.id || line.productCode === selectedItem.code
          })
          salesOrderLineId = matchedLine?.id || 0
        }
      }

      await inventoryService.recordShipment({
        materialId: selectedItem.id,
        salesOrderId: salesOrderId || undefined,
        salesOrderLineId: salesOrderLineId || undefined,
        quantity: formData.quantity,
        cogs: 0,
        batchNo: formData.batchNo,
        orderNo: formData.orderNo,
        shipmentDate: formData.shipmentDate,
        operator: auditUtils.getOperatorInfo().label,
        remarks: formData.remarks,
        sourceCategory: formData.sourceCategory,
        status,
        version: 1, // 新建 record 默认版本 1
      })

      toast.success(
        status === 'DRAFT'
          ? t('warehouse.shipment.toast.savedDraft')
          : t('warehouse.shipment.toast.commitSuccess')
      )
      setIsShipmentOpen(false)
      setSelectedItem(null)
      loadInitialData()
    } catch (e: unknown) {
      toast.error(resolveInventoryErrorTip(e, locale))
    }
  }

  const commitDraft = async (id: string, name: string) => {
    if (!allowsAction('action_warehouse_shipment_commit')) return
    
    const record = history.find(h => h.id === id)
    if (!record) {
      toast.error(t('warehouse.shipment.toast.notFound'))
      return
    }

    if (!confirm(t('warehouse.shipment.toast.commitConfirm', { name }))) {
      return
    }

    try {
      await inventoryService.commitShipment(id)
      toast.success(t('warehouse.shipment.toast.commitRecorded'))
      loadInitialData()
    } catch (e: unknown) {
      toast.error(resolveInventoryErrorTip(e, locale))
    }
  }

  const removeRecord = async (
    id: string,
    name: string,
    quantity: number,
    status: string,
    approvalId?: string
  ) => {
    if (!allowsAction('action_warehouse_shipment_void')) return

    const record = history.find(h => h.id === id)
    if (!record) return

    const dialogMsg =
      status === 'COMMITTED'
        ? t('warehouse.shipment.toast.voidConfirmCommitted', { name, quantity })
        : t('warehouse.shipment.toast.voidConfirmDraft')

    if (!approvalId && !confirm(dialogMsg)) return

    try {
      await inventoryService.deleteShipmentRecord(id, approvalId)
      toast.success(
        status === 'COMMITTED'
          ? t('warehouse.shipment.toast.voidSuccess')
          : t('warehouse.shipment.toast.actionSuccess')
      )
      loadInitialData()
    } catch (e: unknown) {
      toast.error(resolveInventoryErrorTip(e, locale))
    }
  }

  const fillMaxQuantity = () => {
    if (selectedItem) {
      formData.quantity = categoryStock
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    history,
    error,
    isSearching,
    selectedItem,
    isShipmentOpen,
    setIsShipmentOpen,
    warehouseCategories,
    masterDataMap,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    openShipmentForm,
    submitShipment,
    commitDraft,
    removeRecord,
    fillMaxQuantity,
    categoryStock,
    inventoryBreakdown,
    alertThresholds,
    salesOrders,
  }
}
