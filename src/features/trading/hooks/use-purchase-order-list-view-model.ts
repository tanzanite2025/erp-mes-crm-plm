import { useMemo } from 'react'
import { type PurchaseOrderListItem } from '../data/schema'

interface UsePurchaseOrderListViewModelParams {
  orders: PurchaseOrderListItem[]
  searchTerm: string
  statusFilter: string
  paymentMethodFilter: string
  paymentTermFilter: string
  selectedId?: string
}

export function usePurchaseOrderListViewModel({
  orders,
  searchTerm,
  statusFilter,
  paymentMethodFilter,
  paymentTermFilter,
  selectedId,
}: UsePurchaseOrderListViewModelParams) {
  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          order.orderNo,
          order.supplierName,
          order.paymentMethod,
          order.paymentMethodName,
          order.paymentTerm,
          order.paymentTermName,
        ].some((value) => (value?.toLowerCase() ?? '').includes(normalizedSearch))

      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
      const matchesPaymentMethod =
        paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter
      const matchesPaymentTerm = paymentTermFilter === 'ALL' || order.paymentTerm === paymentTermFilter

      return matchesSearch && matchesStatus && matchesPaymentMethod && matchesPaymentTerm
    })
  }, [orders, paymentMethodFilter, paymentTermFilter, searchTerm, statusFilter])

  const selectedOrder = useMemo(
    () =>
      filteredOrders.find((order) => order.id === (selectedId || filteredOrders[0]?.id)) ??
      filteredOrders[0],
    [filteredOrders, selectedId]
  )

  return {
    filteredOrders,
    selectedOrder,
  }
}
