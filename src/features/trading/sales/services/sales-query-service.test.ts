import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  getCustomerProductStats,
  getGlobalProductRanking,
  getSalesOrderById,
  getSalesOrderByNo,
  getSalesOrders,
} from './sales-query-service'
import {
  TRADING_QUERY_PARAM_PAGE,
  TRADING_QUERY_PARAM_PAGE_SIZE,
  TRADING_QUERY_PARAM_PAYMENT_METHOD,
  TRADING_QUERY_PARAM_PAYMENT_TERM,
  TRADING_QUERY_PARAM_STATUS,
  TRADING_QUERY_PARAM_WITH_LINES,
} from '../../query-params'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('sales-query-service', () => {
  it('requires lines on detail payloads loaded by id', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'order-1',
      orderNo: 'SO-001',
      orderName: 'Sales Order 001',
      customerName: 'Acme',
      customerId: 'customer-1',
      type: 'NORMAL',
      currency: 'CNY',
      classification: 'STANDARD',
      status: 'Pending',
      statusNote: '',
      amount: 100,
      quantity: 2,
      orderDate: '2026-04-18',
      deliveryDate: '2026-04-20',
      paymentMethod: '',
      paymentMethodName: '',
      paymentTerm: '',
      paymentTermName: '',
      purchaseOrderNo: '',
      barcode: 'SO-001',
      requirements: '',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      updatedBy: 'tester',
      isDeleted: false,
      version: 1,
      evidences: [],
      fulfillmentRate: 0,
    })

    await expect(getSalesOrderById('order-1')).rejects.toThrow()
  })

  it('requires lines on detail payloads loaded by order number', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'order-1',
      orderNo: 'SO-001',
      orderName: 'Sales Order 001',
      customerName: 'Acme',
      customerId: 'customer-1',
      type: 'NORMAL',
      currency: 'CNY',
      classification: 'STANDARD',
      status: 'Pending',
      statusNote: '',
      amount: 100,
      quantity: 2,
      orderDate: '2026-04-18',
      deliveryDate: '2026-04-20',
      paymentMethod: '',
      paymentMethodName: '',
      paymentTerm: '',
      paymentTermName: '',
      purchaseOrderNo: '',
      barcode: 'SO-001',
      requirements: '',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      updatedBy: 'tester',
      isDeleted: false,
      version: 1,
      evidences: [],
      fulfillmentRate: 0,
    })

    await expect(getSalesOrderByNo('SO-001')).rejects.toThrow()
  })

  it('parses list payloads without lines when withLines is false', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'order-1',
          orderNo: 'SO-001',
          orderName: 'Sales Order 001',
          customerName: 'Acme',
          customerId: 'customer-1',
          type: 'NORMAL',
          currency: 'CNY',
          classification: 'STANDARD',
          status: 'Pending',
          statusNote: '',
          amount: 100,
          quantity: 2,
          orderDate: '2026-04-18',
          deliveryDate: '2026-04-20',
          paymentMethod: '',
          paymentMethodName: '',
          paymentTerm: '',
          paymentTermName: '',
          purchaseOrderNo: '',
          barcode: 'SO-001',
          requirements: '',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
          updatedBy: 'tester',
          isDeleted: false,
          version: 1,
          evidences: [],
          fulfillmentRate: 0,
          availableActions: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const result = await getSalesOrders()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.lines).toEqual([])

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/sales-orders?${TRADING_QUERY_PARAM_PAGE}=1&${TRADING_QUERY_PARAM_PAGE_SIZE}=50`
    )
  })

  it('locks request URL contract when callers request order lines', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await getSalesOrders({ withLines: true })

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/sales-orders?${TRADING_QUERY_PARAM_PAGE}=1&${TRADING_QUERY_PARAM_PAGE_SIZE}=50&${TRADING_QUERY_PARAM_WITH_LINES}=true`
    )
  })

  it('preserves withLines=true when status filters are also present', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 2,
      pageSize: 25,
    })

    await getSalesOrders({
      page: 2,
      pageSize: 25,
      withLines: true,
      status: ['Scheduling'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/sales-orders?${TRADING_QUERY_PARAM_PAGE}=2&${TRADING_QUERY_PARAM_PAGE_SIZE}=25&${TRADING_QUERY_PARAM_WITH_LINES}=true&${TRADING_QUERY_PARAM_STATUS}=Scheduling`
    )
  })

  it('includes payment method and payment term query params when provided', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await getSalesOrders({
      paymentMethod: 'BANK_TRANSFER',
      paymentTerm: 'MONTH_END',
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/sales-orders?${TRADING_QUERY_PARAM_PAGE}=1&${TRADING_QUERY_PARAM_PAGE_SIZE}=50&${TRADING_QUERY_PARAM_PAYMENT_METHOD}=BANK_TRANSFER&${TRADING_QUERY_PARAM_PAYMENT_TERM}=MONTH_END`
    )
  })

  it('rejects list payloads that omit lines when withLines is true', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          id: 'order-1',
          orderNo: 'SO-001',
          orderName: 'Sales Order 001',
          customerName: 'Acme',
          customerId: 'customer-1',
          type: 'NORMAL',
          currency: 'CNY',
          classification: 'STANDARD',
          status: 'Pending',
          statusNote: '',
          amount: 100,
          quantity: 2,
          orderDate: '2026-04-18',
          deliveryDate: '2026-04-20',
          paymentMethod: '',
          paymentMethodName: '',
          paymentTerm: '',
          paymentTermName: '',
          purchaseOrderNo: '',
          barcode: 'SO-001',
          requirements: '',
          createdAt: '2026-04-18T00:00:00.000Z',
          updatedAt: '2026-04-18T00:00:00.000Z',
          updatedBy: 'tester',
          isDeleted: false,
          version: 1,
          evidences: [],
          fulfillmentRate: 0,
          availableActions: [],
        },
      ],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    await expect(getSalesOrders({ withLines: true })).rejects.toThrow()
  })

  it('rejects paginated hybrid arrays so list responses stay locked to object protocol', async () => {
    const hybrid = [
      {
        id: 'order-1',
        orderNo: 'SO-001',
      },
    ] as unknown[] & Record<string, unknown>
    hybrid.items = hybrid
    hybrid.total = 1
    hybrid.page = 1
    hybrid.pageSize = 50

    apiFetchMock.mockResolvedValue(hybrid)

    await expect(getSalesOrders()).rejects.toThrow(
      '[INVALID_RESPONSE] SalesQueryService.getSalesOrders expected an object response.',
    )
  })

  it('maps customer analytics responses to explicit productDisplay contracts', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          customerId: 'customer-1',
          customerName: 'Acme',
          totalOrders: 3,
          totalAmount: 180,
          products: [
            {
              productId: 'product-1',
              productDisplay: {
                title: 'Road Fork',
                subtitle: 'trail/disc/v2',
                code: 'RF-01',
                fullLabel: 'Road Fork (trail/disc/v2)',
                strategyVersion: 'product-display-v1',
              },
              totalQty: 12,
              orderCount: 3,
              totalAmount: 180,
            },
          ],
        },
      ],
      total: 1,
    })

    const result = await getCustomerProductStats({ customerId: 'customer-1' })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/sales-orders/analytics/customer-product-stats?customerId=customer-1'
    )
    expect(result[0]?.products[0]).toEqual(
      expect.objectContaining({
        productId: 'product-1',
        productDisplay: {
          title: 'Road Fork',
          subtitle: 'trail/disc/v2',
          code: 'RF-01',
          fullLabel: 'Road Fork (trail/disc/v2)',
          strategyVersion: 'product-display-v1',
        },
        totalQty: 12,
        orderCount: 3,
        totalAmount: 180,
      })
    )
    expect(result[0]?.products[0]).not.toHaveProperty('productModel')
    expect(result[0]?.products[0]).not.toHaveProperty('productCode')
  })

  it('maps global ranking responses to explicit productDisplay contracts', async () => {
    apiFetchMock.mockResolvedValue({
      items: [
        {
          productId: 'product-1',
          productDisplay: {
            title: 'Road Fork',
            subtitle: 'trail/disc/v2',
            code: 'RF-01',
            fullLabel: 'Road Fork (trail/disc/v2)',
            strategyVersion: 'product-display-v1',
          },
          totalQty: 12,
          orderCount: 3,
          totalAmount: 180,
        },
      ],
      total: 1,
    })

    const result = await getGlobalProductRanking(5)

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/sales-orders/analytics/global-product-ranking?limit=5'
    )
    expect(result[0]).toEqual(
      expect.objectContaining({
        productId: 'product-1',
        productDisplay: {
          title: 'Road Fork',
          subtitle: 'trail/disc/v2',
          code: 'RF-01',
          fullLabel: 'Road Fork (trail/disc/v2)',
          strategyVersion: 'product-display-v1',
        },
        totalQty: 12,
        orderCount: 3,
        totalAmount: 180,
      })
    )
    expect(result[0]).not.toHaveProperty('productModel')
    expect(result[0]).not.toHaveProperty('productCode')
  })
})
