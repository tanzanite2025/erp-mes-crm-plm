import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useQueryMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
}))

const { getSalesOrdersMock, getSalesOrderByIdMock } = vi.hoisted(() => ({
  getSalesOrdersMock: vi.fn(),
  getSalesOrderByIdMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('../services/sales-query-service', () => ({
  getSalesOrders: getSalesOrdersMock,
  getSalesOrderById: getSalesOrderByIdMock,
}))

import { useGetSalesOrders } from './use-sales-queries'

describe('use-sales-queries', () => {
  beforeEach(() => {
    useQueryMock.mockReset()
    getSalesOrdersMock.mockReset()
    getSalesOrderByIdMock.mockReset()
    useQueryMock.mockImplementation((options: unknown) => options)
  })

  it('passes customerId and keyword to the sales order query function', async () => {
    useGetSalesOrders(3, 25, {
      withLines: true,
      status: ['Done'],
      customerId: 'customer-9',
      keyword: 'SO-001',
      paymentMethod: 'BANK_TRANSFER',
      paymentTerm: 'MONTH_END',
      enabled: true,
    })

    expect(useQueryMock).toHaveBeenCalledTimes(1)
    const queryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(queryOptions?.queryKey).toEqual([
      'sales-orders',
      3,
      25,
      true,
      ['Done'],
      'customer-9',
      'SO-001',
      'BANK_TRANSFER',
      'MONTH_END',
    ])

    getSalesOrdersMock.mockResolvedValue({ items: [], total: 0, page: 3, pageSize: 25 })
    await queryOptions?.queryFn()
    expect(getSalesOrdersMock).toHaveBeenCalledWith({
      page: 3,
      pageSize: 25,
      withLines: true,
      status: ['Done'],
      customerId: 'customer-9',
      keyword: 'SO-001',
      paymentMethod: 'BANK_TRANSFER',
      paymentTerm: 'MONTH_END',
    })
  })

  it('normalizes blank customerId and keyword before query execution', async () => {
    useGetSalesOrders(1, 50, {
      customerId: '   ',
      keyword: '  ',
      enabled: false,
    })

    expect(useQueryMock).toHaveBeenCalledTimes(1)
    const queryOptions = useQueryMock.mock.calls[0]?.[0]
    expect(queryOptions?.queryKey).toEqual([
      'sales-orders',
      1,
      50,
      false,
      [],
      '',
      '',
      '',
      '',
    ])
    expect(queryOptions?.enabled).toBe(false)

    getSalesOrdersMock.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 50 })
    await queryOptions?.queryFn()
    expect(getSalesOrdersMock).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      withLines: false,
      status: [],
      customerId: undefined,
      keyword: undefined,
      paymentMethod: undefined,
      paymentTerm: undefined,
    })
  })
})
