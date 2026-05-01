import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import {
  executePurchaseOrderReceiptConfirmation,
  executePurchaseOrderTransaction,
} from './purchase-transaction-service'

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('purchase-transaction-service', () => {
  it('requires lines on transaction responses', async () => {
    apiFetchMock.mockResolvedValue({
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
      isDeleted: false,
      createdAt: '2026-04-18T00:00:00.000Z',
      updatedAt: '2026-04-18T00:00:00.000Z',
      version: 1,
      evidences: [],
    })

    await expect(
      executePurchaseOrderTransaction('po-1', {
        intent: 'ORDER_DELIVERY_DATE_CHANGE',
        expectedVersion: 1,
        payload: {
          expectedDate: '2026-04-26',
          operator: 'tester',
        },
      })
    ).rejects.toThrow()
  })

  it('requires lines on receipt confirmation purchaseOrder responses', async () => {
    apiFetchMock.mockResolvedValue({
      purchaseOrder: {
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
        isDeleted: false,
        createdAt: '2026-04-18T00:00:00.000Z',
        updatedAt: '2026-04-18T00:00:00.000Z',
        version: 1,
        evidences: [],
      },
      createdInboundRecords: [{ id: 'inbound-1' }],
    })

    await expect(
      executePurchaseOrderReceiptConfirmation('po-1', {
        operator: 'tester',
        expectedVersion: 1,
        lines: [],
      })
    ).rejects.toThrow()
  })
})
