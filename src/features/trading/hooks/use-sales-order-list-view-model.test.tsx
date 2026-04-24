// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderListViewModel } from './use-sales-order-list-view-model'

function makeOrder(overrides: Partial<SalesOrder>): SalesOrder {
  return {
    id: 'order-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    isDeleted: false,
    orderNo: 'SO-001',
    orderName: 'Order',
    customerName: 'Acme',
    customerId: 'customer-1',
    type: 'NORMAL',
    currency: 'CNY',
    paymentMethod: 'BANK',
    paymentMethodName: 'Bank',
    paymentTerm: 'NET30',
    paymentTermName: 'Net 30',
    classification: 'A',
    status: 'Pending',
    statusNote: '',
    amount: 100,
    quantity: 10,
    orderDate: '2026-01-01',
    deliveryDate: '2026-01-02',
    purchaseOrderNo: 'PO-001',
    barcode: 'BC-001',
    requirements: '',
    lines: [],
    version: 1,
    ...overrides,
  }
}

describe('use-sales-order-list-view-model', () => {
  it('keeps canceled orders visible when status filter is all', () => {
    const orders = [
      makeOrder({ id: 'done-1', status: 'Done', orderNo: 'SO-DONE' }),
      makeOrder({ id: 'canceled-1', status: 'Canceled', orderNo: 'SO-CANCEL' }),
    ]

    const { result } = renderHook(() =>
      useSalesOrderListViewModel({
        orders,
        searchTerm: '',
        statusFilter: 'all',
        paymentMethodFilter: 'ALL',
        paymentTermFilter: 'ALL',
        selectedId: null,
      })
    )

    expect(result.current.filteredOrders.map((item) => item.id)).toEqual([
      'done-1',
      'canceled-1',
    ])
  })

  it('applies explicit status filters by status value', () => {
    const orders = [
      makeOrder({ id: 'pending-1', status: 'Pending' }),
      makeOrder({ id: 'canceled-1', status: 'Canceled' }),
    ]

    const { result } = renderHook(() =>
      useSalesOrderListViewModel({
        orders,
        searchTerm: '',
        statusFilter: 'Canceled',
        paymentMethodFilter: 'ALL',
        paymentTermFilter: 'ALL',
        selectedId: null,
      })
    )

    expect(result.current.filteredOrders).toHaveLength(1)
    expect(result.current.filteredOrders[0]?.id).toBe('canceled-1')
  })
})
