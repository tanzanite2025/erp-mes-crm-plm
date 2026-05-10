import { describe, expect, it } from 'vitest'
import { getCustomerSalesClosureMetrics } from './customer-sales-closure-metrics'

describe('getCustomerSalesClosureMetrics', () => {
  it('treats canceled-only customers as having no effective orders while preserving canceled state', () => {
    const metrics = getCustomerSalesClosureMetrics({
      customerId: 'cust-1',
      canceledOrderCount: 1,
      effectiveOrderCount: 0,
      primaryStatusCode: 'Canceled',
      primaryStatusPhase: 'cancelled',
      statusCounts: [
        {
          code: 'Canceled',
          phase: 'cancelled',
          count: 1,
        },
      ],
      lastOrderDate: '2026-04-30',
      totalOrders: 1,
    })

    expect(metrics.hasOnlyCanceledOrders).toBe(true)
    expect(metrics.primaryStatusCode).toBe('Canceled')
    expect(metrics.primaryStatusPhase).toBe('cancelled')
    expect(metrics.effectiveStatusCounts).toEqual([])
    expect(metrics.areAllEffectiveOrdersDone).toBe(false)
  })

  it('keeps scheduling as the primary status until all effective orders are done', () => {
    const metrics = getCustomerSalesClosureMetrics({
      customerId: 'cust-2',
      canceledOrderCount: 1,
      effectiveOrderCount: 2,
      primaryStatusCode: 'Scheduling',
      primaryStatusPhase: 'scheduling',
      statusCounts: [
        {
          code: 'Scheduling',
          phase: 'scheduling',
          count: 1,
        },
        {
          code: 'Done',
          phase: 'done',
          count: 1,
        },
        {
          code: 'Canceled',
          phase: 'cancelled',
          count: 1,
        },
      ],
      lastOrderDate: '2026-04-30',
      totalOrders: 3,
    })

    expect(metrics.hasOnlyCanceledOrders).toBe(false)
    expect(metrics.primaryStatusCode).toBe('Scheduling')
    expect(metrics.primaryStatusPhase).toBe('scheduling')
    expect(metrics.effectiveStatusCounts).toEqual([
      {
        code: 'Scheduling',
        phase: 'scheduling',
        count: 1,
      },
      {
        code: 'Done',
        phase: 'done',
        count: 1,
      },
    ])
    expect(metrics.effectiveOrderCount).toBe(2)
    expect(metrics.areAllEffectiveOrdersDone).toBe(false)
  })

  it('marks the summary as done only when every effective order is done', () => {
    const metrics = getCustomerSalesClosureMetrics({
      customerId: 'cust-3',
      canceledOrderCount: 0,
      effectiveOrderCount: 2,
      primaryStatusCode: 'Done',
      primaryStatusPhase: 'done',
      statusCounts: [
        {
          code: 'Done',
          phase: 'done',
          count: 2,
        },
      ],
      lastOrderDate: '2026-04-30',
      totalOrders: 2,
    })

    expect(metrics.primaryStatusCode).toBe('Done')
    expect(metrics.areAllEffectiveOrdersDone).toBe(true)
  })
})
