import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { getCustomerSalesReturnSummaryList } from './customer-sales-return-summary-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('customer-sales-return-summary-service', () => {
  it('parses effective and canceled order counts from the authoritative summary contract', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          customerId: 'cust-1',
          returnedQuantity: 0,
          returnedOrderCount: 0,
          lastReturnDate: '',
          canceledOrderCount: 1,
          effectiveOrderCount: 0,
          totalOrders: 1,
        },
      ],
      total: 1,
    })

    const result = await getCustomerSalesReturnSummaryList()

    expect(apiFetchMock).toHaveBeenCalledWith('/customers/sales-return-summary')
    expect(result.items[0]?.returnedOrderCount).toBe(0)
    expect(result.items[0]?.effectiveOrderCount).toBe(0)
    expect(result.items[0]?.canceledOrderCount).toBe(1)
  })

  it('rejects legacy summary payloads that omit the effective denominator', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          customerId: 'cust-1',
          returnedQuantity: 0,
          returnedOrderCount: 0,
          lastReturnDate: '',
          totalOrders: 1,
        },
      ],
      total: 1,
    })

    await expect(getCustomerSalesReturnSummaryList()).rejects.toThrow(
      '[INVALID_RESPONSE] CustomerSalesReturnSummaryService.getCustomerSalesReturnSummaryList expected canceledOrderCount to be a number.'
    )
  })
})
