import { useMemo } from 'react'
import { type SalesOrder } from '../data/schema'

interface UseSalesOrderListViewModelParams {
  orders: SalesOrder[]
  searchTerm: string
  statusFilter: string
  paymentMethodFilter: string
  paymentTermFilter: string
  selectedId: string | null
}

export function useSalesOrderListViewModel({
  orders,
  searchTerm,
  statusFilter,
  paymentMethodFilter,
  paymentTermFilter,
  selectedId,
}: UseSalesOrderListViewModelParams) {
  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          order.orderNo,
          order.customerName,
          order.purchaseOrderNo,
          order.paymentMethod,
          order.paymentMethodName,
          order.paymentTerm,
          order.paymentTermName,
        ].some((value) => (value?.toLowerCase() ?? '').includes(normalizedSearch))

      const matchesStatus =
        statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase()
      const matchesPaymentMethod =
        paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter
      const matchesPaymentTerm = paymentTermFilter === 'ALL' || order.paymentTerm === paymentTermFilter

      return matchesSearch && matchesStatus && matchesPaymentMethod && matchesPaymentTerm
    })
  }, [orders, paymentMethodFilter, paymentTermFilter, searchTerm, statusFilter])

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedId) ?? orders.find((order) => order.id === selectedId),
    [filteredOrders, orders, selectedId]
  )

  return {
    filteredOrders,
    selectedOrder,
  }
}
