import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock, archiveByOrderIdMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  archiveByOrderIdMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

vi.mock('@/features/system-mgmt/notifications/notification-gateway', () => ({
  NotificationGateway: {
    archiveByOrderId: archiveByOrderIdMock,
  },
}))

import { createSalesOrder, patchSalesOrder } from './sales-service'

const detailOrderResponse = {
  id: 'order-1',
  orderNo: 'SO-001',
  orderName: 'Sales Order 001',
  customerName: 'Acme',
  customerId: 'customer-1',
  type: 'NORMAL',
  currency: 'CNY',
  exchangeRateSnapshot: 1,
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
  lines: [
    {
      id: 1,
      lineNo: 1,
      productId: 'product-1',
      productModel: 'PM-001',
      productCode: 'PC-001',
      specification: 'spec',
      description: 'desc',
      qty: 2,
      uom: 'PCS',
      price: 10,
      amount: 20,
      deliveredQty: 0,
      customerPartNo: 'CP-001',
      jobNo: 'JOB-001',
      note: '',
      drillingPlanId: '',
      labelingPlanId: '',
      holeCount: 0,
      route: '',
      orderDate: '2026-04-18',
      status: 'Pending',
      claimedBy: '',
      claimedAt: '',
      returnedQuantity: 0,
      remainingReturnableQuantity: 2,
    },
  ],
}

beforeEach(() => {
  apiFetchMock.mockReset()
  archiveByOrderIdMock.mockReset()
})

describe('sales-service', () => {
  it('requires lines on create responses', async () => {
    const { lines: _lines, ...invalidDetail } = detailOrderResponse
    apiFetchMock.mockResolvedValue(invalidDetail)

    await expect(
      createSalesOrder({
        orderNo: 'SO-001',
        orderName: 'Sales Order 001',
        customerName: 'Acme',
        customerId: 'customer-1',
        type: 'NORMAL',
        currency: 'CNY',
        exchangeRateSnapshot: 1,
        paymentMethod: '',
        paymentMethodName: '',
        paymentTerm: '',
        paymentTermName: '',
        classification: 'STANDARD',
        status: 'Pending',
        statusNote: '',
        evidences: [],
        amount: 100,
        quantity: 2,
        orderDate: '2026-04-18',
        deliveryDate: '2026-04-20',
        purchaseOrderNo: '',
        barcode: 'SO-001',
        requirements: '',
        lines: [],
        fulfillmentRate: 0,
        version: 1,
      })
    ).rejects.toThrow()
  })

  it('sanitizes derived amount fields before create request', async () => {
    apiFetchMock.mockResolvedValue(detailOrderResponse)

    await createSalesOrder({
      orderNo: 'SO-001',
      orderName: 'Sales Order 001',
      customerName: 'Acme',
      customerId: 'customer-1',
      type: 'NORMAL',
      currency: 'CNY',
      exchangeRateSnapshot: 1,
      paymentMethod: '',
      paymentMethodName: '',
      paymentTerm: '',
      paymentTermName: '',
      classification: 'STANDARD',
      status: 'Pending',
      statusNote: '',
      evidences: [],
      amount: 999,
      quantity: 888,
      orderDate: '2026-04-18',
      deliveryDate: '2026-04-20',
      purchaseOrderNo: '',
      barcode: 'SO-001',
      requirements: '',
      lines: [
        {
          lineNo: 1,
          productId: 'product-1',
          productModel: 'PM-001',
          productCode: 'PC-001',
          specification: 'spec',
          description: 'desc',
          qty: 2,
          uom: 'PCS',
          price: 10,
          amount: 777,
          deliveredQty: 0,
          customerPartNo: 'CP-001',
          jobNo: 'JOB-001',
          note: '',
          drillingPlanId: '',
          labelingPlanId: '',
          holeCount: 0,
          route: '',
          orderDate: '2026-04-18',
          status: 'Pending',
          returnedQuantity: 0,
          remainingReturnableQuantity: 0,
        },
      ],
      fulfillmentRate: 0,
      version: 1,
    })

    expect(apiFetchMock).toHaveBeenCalledTimes(1)
    const [, options] = apiFetchMock.mock.calls[0]
    const body = JSON.parse(String(options?.body))

    expect(body.amount).toBe(0)
    expect(body.quantity).toBe(0)
    expect(body.lines[0]?.amount).toBe(0)
  })

  it('requires lines on patch responses', async () => {
    const { lines: _lines, ...invalidDetail } = detailOrderResponse
    apiFetchMock.mockResolvedValue(invalidDetail)

    await expect(
      patchSalesOrder('order-1', { status: { o: 'Draft', n: 'Pending' } }, 1)
    ).rejects.toThrow()
  })
})
