import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { createPaymentRecord, getPayableLedgerDetail } from './payable-ledger-detail-service'

const detail = {
  id: 'payable-1',
  documentNo: 'AP-001',
  supplierName: 'Acme Supplier',
  currency: 'CNY',
  invoiceAmount: 100,
  paidAmount: 40,
  outstandingAmount: 60,
  dueDate: '2026-04-30',
  agingBucket: 'OPEN',
  status: 'OPEN',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
  sourceType: 'PURCHASE_ORDER',
  sourceRefId: 'PO-001',
  supplierId: 'SUP-001',
  version: 1,
  paymentRecords: [],
  allocations: [],
}

const paymentRecord = {
  id: 'payment-1',
  recordNo: 'PAY-001',
  ledgerId: 'payable-1',
  amount: 60,
  currency: 'CNY',
  paymentMethod: 'BANK',
  paymentTerm: 'NET30',
  recordDate: '2026-04-19',
  status: 'CONFIRMED',
  referenceNo: 'REF-001',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
  evidences: [],
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('PayableLedgerDetailService', () => {
  it('deserializes payable detail responses with the locked contract', async () => {
    apiFetchMock.mockResolvedValue(detail)

    await expect(getPayableLedgerDetail('payable-1')).resolves.toEqual(detail)
    expect(apiFetchMock).toHaveBeenCalledWith('/payables/payable-1')
  })

  it('rejects payable detail responses that omit allocations', async () => {
    const { allocations: _allocations, ...withoutAllocations } = detail
    apiFetchMock.mockResolvedValue(withoutAllocations)

    await expect(getPayableLedgerDetail('payable-1')).rejects.toThrow()
  })

  it('deserializes create payment responses with the locked contract', async () => {
    const response = {
      ledger: detail,
      record: paymentRecord,
      allocations: [],
    }
    const payload = {
      amount: 60,
      allocations: [{ ledgerId: 'payable-1', allocatedAmount: 60 }],
    }
    apiFetchMock.mockResolvedValue(response)

    await expect(createPaymentRecord('payable-1', payload)).resolves.toEqual(response)
    expect(apiFetchMock).toHaveBeenCalledWith('/payables/payable-1/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('rejects malformed create payment payloads before sending the request', async () => {
    await expect(createPaymentRecord('payable-1', { amount: 60 } as never)).rejects.toThrow()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})
