import { useMemo } from 'react'
import type { PurchaseOrder } from '../data/schema'
import type { PurchaseReturnRecord } from '../purchase'

export interface PurchaseReturnLineDraftLike {
  quantity: number
  issueCategory: string
  reason: string
}

export function getPurchaseOrderRemainingQty(order: PurchaseOrder, lineId?: number) {
  const line = order.lines.find((item) => item.id === lineId)
  if (!line) return 0
  return Math.max((line.qty || 0) - (line.receivedQty || 0) - (line.returnedQty || 0), 0)
}

export function getPurchaseOrderPendingLines(order?: PurchaseOrder) {
  if (!order) return []
  return order.lines.filter((line) => line.id && getPurchaseOrderRemainingQty(order, line.id) > 0)
}

interface UsePurchaseReturnViewModelParams {
  orders: PurchaseOrder[]
  records: PurchaseReturnRecord[]
  searchValue: string
  historyOrderNo: string
  selectedOrderId: string
  lineDrafts: Record<number, PurchaseReturnLineDraftLike>
}

export function usePurchaseReturnViewModel({
  orders,
  records,
  searchValue,
  historyOrderNo,
  selectedOrderId,
  lineDrafts,
}: UsePurchaseReturnViewModelParams) {
  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (order.status === 'Sent' || order.status === 'Awaiting') &&
          order.lines.some((line) => getPurchaseOrderRemainingQty(order, line.id) > 0)
      ),
    [orders]
  )

  const normalizedSearch = searchValue.trim().toLowerCase()

  const filteredEligibleOrders = useMemo(() => {
    if (!normalizedSearch) return eligibleOrders
    return eligibleOrders.filter((order) =>
      [order.orderNo, order.supplierName, order.purchaser]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    )
  }, [eligibleOrders, normalizedSearch])

  const eligibleOrderStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        pendingLinesCount: number
        pendingQty: number
      }
    >()

    eligibleOrders.forEach((order) => {
      const pendingLines = getPurchaseOrderPendingLines(order)
      const pendingQty = pendingLines.reduce(
        (sum, line) => sum + (line.id ? getPurchaseOrderRemainingQty(order, line.id) : 0),
        0
      )

      stats.set(order.id, {
        pendingLinesCount: pendingLines.length,
        pendingQty,
      })
    })

    return stats
  }, [eligibleOrders])

  const selectedOrder = useMemo(() => {
    const exactMatch =
      filteredEligibleOrders.find((item) => item.id === selectedOrderId) ||
      eligibleOrders.find((item) => item.id === selectedOrderId)
    return exactMatch ?? filteredEligibleOrders[0] ?? eligibleOrders[0]
  }, [eligibleOrders, filteredEligibleOrders, selectedOrderId])

  const selectedPendingLines = useMemo(
    () => getPurchaseOrderPendingLines(selectedOrder),
    [selectedOrder]
  )

  const selectedPendingQty = useMemo(
    () =>
      selectedPendingLines.reduce(
        (sum, line) => sum + (line.id ? getPurchaseOrderRemainingQty(selectedOrder!, line.id) : 0),
        0
      ),
    [selectedOrder, selectedPendingLines]
  )

  const draftSummary = useMemo(() => {
    if (!selectedOrder) {
      return { selectedLines: 0, totalQty: 0, totalAmount: 0 }
    }

    return selectedPendingLines.reduce(
      (summary, line) => {
        if (!line.id) return summary
        const draftQty = Math.min(
          Math.max(Number(lineDrafts[line.id]?.quantity || 0), 0),
          getPurchaseOrderRemainingQty(selectedOrder, line.id)
        )
        if (draftQty <= 0) return summary

        summary.selectedLines += 1
        summary.totalQty += draftQty
        summary.totalAmount += draftQty * (line.price || 0)
        return summary
      },
      { selectedLines: 0, totalQty: 0, totalAmount: 0 }
    )
  }, [lineDrafts, selectedOrder, selectedPendingLines])

  const groupedEligibleOrders = useMemo(() => {
    const supplierMap = new Map<
      string,
      {
        supplierName: string
        groups: Array<{ status: string; orders: PurchaseOrder[] }>
      }
    >()

    filteredEligibleOrders.forEach((order) => {
      const supplierKey = order.supplierName || '未指定供应商'
      const supplierEntry = supplierMap.get(supplierKey) ?? {
        supplierName: supplierKey,
        groups: [],
      }
      let statusGroup = supplierEntry.groups.find((item) => item.status === order.status)
      if (!statusGroup) {
        statusGroup = { status: order.status, orders: [] }
        supplierEntry.groups.push(statusGroup)
      }
      statusGroup.orders.push(order)
      supplierMap.set(supplierKey, supplierEntry)
    })

    return Array.from(supplierMap.values()).sort((a, b) => a.supplierName.localeCompare(b.supplierName))
  }, [filteredEligibleOrders])

  const visibleRecords = useMemo(() => {
    const normalized = historyOrderNo.trim().toLowerCase()
    if (normalized) {
      return records.filter((record) => record.purchaseOrderNo.toLowerCase().includes(normalized))
    }
    if (!selectedOrder) return records
    const matched = records.filter((record) => record.purchaseOrderId === selectedOrder.id)
    return matched.length > 0 ? matched : records
  }, [historyOrderNo, records, selectedOrder])

  const totalReturnedAmount = useMemo(
    () => records.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0),
    [records]
  )

  const totalReturnedQty = useMemo(
    () => records.reduce((sum, item) => sum + (Number(item.totalQuantity) || 0), 0),
    [records]
  )

  const totalPendingLineCount = useMemo(
    () => eligibleOrders.reduce((sum, order) => sum + getPurchaseOrderPendingLines(order).length, 0),
    [eligibleOrders]
  )

  return {
    draftSummary,
    eligibleOrders,
    eligibleOrderStats,
    filteredEligibleOrders,
    groupedEligibleOrders,
    selectedOrder,
    selectedPendingLines,
    selectedPendingQty,
    totalPendingLineCount,
    totalReturnedAmount,
    totalReturnedQty,
    visibleRecords,
  }
}
