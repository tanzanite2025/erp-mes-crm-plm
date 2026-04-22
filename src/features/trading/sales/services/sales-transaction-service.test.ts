import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { executeSalesOrderTransaction } from './sales-transaction-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('sales-transaction-service', () => {
  it('requires lines on transaction responses', async () => {
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
      workflowInstanceId: '',
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      updatedBy: 'tester',
      isDeleted: false,
      version: 1,
      evidences: [],
      fulfillmentRate: 0,
    })

    await expect(
      executeSalesOrderTransaction('order-1', {
        intent: 'ORDER_STATUS_TRANSITION',
        expectedVersion: 1,
        payload: {
          status: 'Pending',
          operator: 'tester',
        },
      })
    ).rejects.toThrow()
  })
})
