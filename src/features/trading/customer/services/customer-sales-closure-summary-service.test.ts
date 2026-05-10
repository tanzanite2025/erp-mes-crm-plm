import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { getCustomerSalesClosureSummaryList } from './customer-sales-closure-summary-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('customer-sales-closure-summary-service', () => {
  it('parses the authoritative summary contract and allows empty lastOrderDate', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          customerId: 'cust-1',
          canceledOrderCount: 0,
          effectiveOrderCount: 1,
          primaryStatusCode: 'Scheduling',
          primaryStatusPhase: 'scheduling',
          statusCounts: [
            {
              code: 'Scheduling',
              phase: 'scheduling',
              count: 1,
            },
          ],
          lastOrderDate: '',
          totalOrders: 1,
        },
      ],
      total: 1,
      metadata: {
        pagination: {
          total: 1,
          page: 1,
          pageSize: 1,
        },
        stats: {
          total: 2,
          active: 1,
          newThisMonth: 1,
        },
      },
    })

    const result = await getCustomerSalesClosureSummaryList()

    expect(apiFetchMock).toHaveBeenCalledWith('/customers/sales-closure-summary')
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.lastOrderDate).toBe('')
    expect(result.items[0]?.canceledOrderCount).toBe(0)
    expect(result.items[0]?.effectiveOrderCount).toBe(1)
    expect(result.items[0]?.primaryStatusCode).toBe('Scheduling')
    expect(result.items[0]?.primaryStatusPhase).toBe('scheduling')
    expect(result.items[0]?.statusCounts).toEqual([
      {
        code: 'Scheduling',
        phase: 'scheduling',
        count: 1,
      },
    ])
    expect(result.metadata.stats.active).toBe(1)
    expect(result.metadata.pagination.pageSize).toBe(1)
  })

  it('rejects summary payloads that omit metadata instead of silently degrading', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          customerId: 'cust-1',
          canceledOrderCount: 0,
          effectiveOrderCount: 0,
          primaryStatusCode: '',
          primaryStatusPhase: '',
          statusCounts: [],
          lastOrderDate: '',
          totalOrders: 0,
        },
      ],
      total: 1,
    })

    await expect(getCustomerSalesClosureSummaryList()).rejects.toThrow(
      '[INVALID_RESPONSE] CustomerSalesClosureSummaryService.getCustomerSalesClosureSummaryList expected "metadata" to be an object.'
    )
  })
})
