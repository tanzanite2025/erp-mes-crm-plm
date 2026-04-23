import { useMemo } from 'react'
import { type SalesOrder } from '../data/schema'

interface UseSalesOrderListViewModelParams {
  orders: SalesOrder[]
  searchTerm: string
  statusFilter: string
  paymentMethodFilter: string
  paymentTermFilter: string
  customerId?: string
  customerName?: string
  selectedId: string | null
}

export function useSalesOrderListViewModel({
  orders,
  searchTerm,
  statusFilter,
  paymentMethodFilter,
  paymentTermFilter,
  customerId,
  customerName,
  selectedId,
}: UseSalesOrderListViewModelParams) {
  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const normalizedCustomerId = customerId?.trim() ?? ''
    const normalizedCustomerName = customerName?.trim().toLowerCase() ?? ''

    return orders.filter((order) => {
      const matchesCustomerContext =
        normalizedCustomerId.length === 0
          ? normalizedCustomerName.length === 0 || (order.customerName?.toLowerCase() ?? '') === normalizedCustomerName
          : (order.customerId ?? '') === normalizedCustomerId

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
        statusFilter === 'all'
          ? order.status !== 'Canceled'
          : order.status.toLowerCase() === statusFilter.toLowerCase()
      const matchesPaymentMethod =
        paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter
      const matchesPaymentTerm = paymentTermFilter === 'ALL' || order.paymentTerm === paymentTermFilter

      return matchesCustomerContext && matchesSearch && matchesStatus && matchesPaymentMethod && matchesPaymentTerm
    })
  }, [customerId, customerName, orders, paymentMethodFilter, paymentTermFilter, searchTerm, statusFilter])

  const selectedOrder = useMemo(
    () => filteredOrders.find((order) => order.id === selectedId) ?? orders.find((order) => order.id === selectedId),
    [filteredOrders, orders, selectedId]
  )

  return {
    filteredOrders,
    selectedOrder,
  }
}
