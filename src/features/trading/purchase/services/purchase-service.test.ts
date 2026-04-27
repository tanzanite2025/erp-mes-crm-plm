import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  createPurchaseOrder,
  getPurchaseOrderById,
  getDeletedPurchaseOrders,
  getPurchaseOrders,
  patchPurchaseOrder,
} from './purchase-service'
import {
  TRADING_QUERY_PARAM_PAGE,
  TRADING_QUERY_PARAM_PAGE_SIZE,
  TRADING_QUERY_PARAM_STATUS,
  TRADING_QUERY_PARAM_WITH_LINES,
} from '../../query-params'

const detailOrderResponse = {
  id: 'po-1',
  orderNo: 'PO-001',
  supplierName: 'Supplier A',
  supplierId: 'supplier-1',
  status: 'Draft',
  amount: 100,
  orderDate: '2026-04-18',
  expectedDate: '2026-04-25',
  purchaser: 'buyer',
  currency: 'CNY',
  exchangeRate: 1,
  paymentMethod: '',
  paymentMethodName: '',
  paymentTerm: '',
  paymentTermName: '',
  note: '',
  workflowInstanceId: '',
  isDeleted: false,
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  version: 1,
  evidences: [],
  lines: [
    {
      id: 1,
      version: 1,
      lineNo: 1,
      materialId: 'material-1',
      materialName: 'Copper',
      materialCode: 'MAT-001',
      specification: 'spec',
      qty: 2,
      uom: 'PCS',
      price: 10,
      amount: 20,
      expectedDate: '2026-04-25',
      receivedQty: 0,
      returnedQty: 0,
      status: 'Draft',
      note: '',
    },
  ],
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('purchase-service', () => {
  it('requires lines on detail payloads loaded by id', async () => {
    const { lines: _lines, ...invalidDetail } = detailOrderResponse
    apiFetchMock.mockResolvedValue(invalidDetail)

    await expect(getPurchaseOrderById('po-1')).rejects.toThrow()
  })

  it('maps withLines=false list payloads into lightweight contracts without lines', async () => {
    const { lines: _lines, ...listItem } = detailOrderResponse
    apiFetchMock.mockResolvedValue({
      items: [listItem],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    const result = await getPurchaseOrders()

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/purchase/orders?${TRADING_QUERY_PARAM_PAGE}=1&${TRADING_QUERY_PARAM_PAGE_SIZE}=50`
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).not.toHaveProperty('lines')
  })

  it('locks request URL contract when callers request purchase order lines', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 50,
    })

    await getPurchaseOrders({ withLines: true })

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/purchase/orders?${TRADING_QUERY_PARAM_PAGE}=1&${TRADING_QUERY_PARAM_PAGE_SIZE}=50&${TRADING_QUERY_PARAM_WITH_LINES}=true`
    )
  })

  it('preserves pagination when adding withLines=true', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 3,
      pageSize: 10,
    })

    await getPurchaseOrders({ page: 3, pageSize: 10, withLines: true })

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/purchase/orders?${TRADING_QUERY_PARAM_PAGE}=3&${TRADING_QUERY_PARAM_PAGE_SIZE}=10&${TRADING_QUERY_PARAM_WITH_LINES}=true`
    )
  })

  it('preserves status filters in the purchase order list request URL', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    })

    await getPurchaseOrders({
      page: 1,
      pageSize: 100,
      status: ['Sent'],
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/purchase/orders?${TRADING_QUERY_PARAM_PAGE}=1&${TRADING_QUERY_PARAM_PAGE_SIZE}=100&${TRADING_QUERY_PARAM_STATUS}=Sent`
    )
  })

  it('uses shared pagination query keys for deleted purchase orders', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 4,
      pageSize: 15,
    })

    await getDeletedPurchaseOrders(4, 15)

    expect(apiFetchMock).toHaveBeenCalledWith(
      `/purchase/deleted-orders?${TRADING_QUERY_PARAM_PAGE}=4&${TRADING_QUERY_PARAM_PAGE_SIZE}=15`
    )
  })

  it('rejects list payloads that omit lines when withLines is true', async () => {
    const { lines: _lines, ...listItem } = detailOrderResponse
    apiFetchMock.mockResolvedValue({
      items: [listItem],
      total: 1,
      page: 1,
      pageSize: 50,
    })

    await expect(getPurchaseOrders({ withLines: true })).rejects.toThrow()
  })

  it('requires lines on create responses', async () => {
    const { lines: _lines, ...invalidDetail } = detailOrderResponse
    apiFetchMock.mockResolvedValue(invalidDetail)

    await expect(
      createPurchaseOrder({
        orderNo: 'PO-001',
        supplierName: 'Supplier A',
        supplierId: 'supplier-1',
        status: 'Draft',
        amount: 100,
        orderDate: '2026-04-18',
        expectedDate: '2026-04-25',
        purchaser: 'buyer',
        currency: 'CNY',
        exchangeRate: 1,
        paymentMethod: '',
        paymentMethodName: '',
        paymentTerm: '',
        paymentTermName: '',
        note: '',
        workflowInstanceId: '',
        isDeleted: false,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
        evidences: [],
        lines: [],
      })
    ).rejects.toThrow()
  })

  it('requires lines on patch responses', async () => {
    const { lines: _lines, ...invalidDetail } = detailOrderResponse
    apiFetchMock.mockResolvedValue(invalidDetail)

    await expect(patchPurchaseOrder('po-1', { status: { o: 'Draft', n: 'Pending' } }, 1)).rejects.toThrow()
  })
})
