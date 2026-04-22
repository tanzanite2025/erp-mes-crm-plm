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
  workflowInstanceId: '',
  createdAt: '2026-04-18T00:00:00.000Z',
  updatedAt: '2026-04-18T00:00:00.000Z',
  updatedBy: 'tester',
  isDeleted: false,
  version: 1,
  evidences: [],
  fulfillmentRate: 0,
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
        workflowInstanceId: '',
        version: 1,
        isDeleted: false,
      })
    ).rejects.toThrow()
  })

  it('requires lines on patch responses', async () => {
    const { lines: _lines, ...invalidDetail } = detailOrderResponse
    apiFetchMock.mockResolvedValue(invalidDetail)

    await expect(
      patchSalesOrder('order-1', { set: {} }, 1)
    ).rejects.toThrow()
  })
})
