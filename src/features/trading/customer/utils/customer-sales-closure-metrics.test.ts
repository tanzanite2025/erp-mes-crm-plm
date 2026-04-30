import { describe, expect, it } from 'vitest'
import { getCustomerSalesClosureMetrics } from './customer-sales-closure-metrics'

describe('getCustomerSalesClosureMetrics', () => {
  it('excludes canceled orders from the closure ratio', () => {
    const metrics = getCustomerSalesClosureMetrics({
      customerId: 'cust-1',
      hasOpenOrders: false,
      openOrderCount: 0,
      closedOrderCount: 0,
      canceledOrderCount: 1,
      effectiveOrderCount: 0,
      lastOrderDate: '2026-04-30',
      totalOrders: 1,
    })

    expect(metrics.closureRatioLabel).toBe('0/0')
    expect(metrics.closureStatusLabel).toBe('无有效订单')
    expect(metrics.canceledStatusLabel).toBe('已作废 1 单')
    expect(metrics.isFullyClosed).toBe(false)
  })

  it('keeps active closed orders visible while separately flagging canceled orders', () => {
    const metrics = getCustomerSalesClosureMetrics({
      customerId: 'cust-2',
      hasOpenOrders: true,
      openOrderCount: 1,
      closedOrderCount: 1,
      canceledOrderCount: 1,
      effectiveOrderCount: 2,
      lastOrderDate: '2026-04-30',
      totalOrders: 3,
    })

    expect(metrics.closureRatioLabel).toBe('1/2')
    expect(metrics.closureStatusLabel).toBe('未闭环 1 单')
    expect(metrics.canceledStatusLabel).toBe('已作废 1 单')
    expect(metrics.closedOrderCount).toBe(1)
    expect(metrics.effectiveOrderCount).toBe(2)
  })
})
