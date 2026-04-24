import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { createReceiptRecord, getReceivableLedgerDetail } from './receivable-ledger-detail-service'

const detail = {
  id: 'receivable-1',
  documentNo: 'AR-001',
  customerName: 'Acme Customer',
  currency: 'CNY',
  orderAmount: 100,
  receivedAmount: 40,
  outstandingAmount: 45,
  dueDate: '2026-04-30',
  agingBucket: 'CURRENT',
  status: 'OPEN',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
  sourceType: 'SALES_ORDER',
  sourceRefId: 'receivable-1',
  customerId: 'CUST-001',
  version: 1,
  receiptRecords: [],
  allocations: [],
  returnAdjustmentAmount: 15,
  salesReturnActualAmountRecords: [
    {
      id: 'return-adjustment-1',
      salesReturnId: 'sales-return-1',
      salesOrderId: 'receivable-1',
      salesOrderNo: 'SO-001',
      returnNo: 'SR-001',
      customerId: 'CUST-001',
      customerName: 'Acme Customer',
      amount: 15,
      note: 'customer confirmed return deduction',
      evidences: [],
      estimatedReturnAmountSnapshot: 20,
      recordedAt: '2026-04-19T10:30:00Z',
      recordedBy: 'finance-user',
      createdAt: '2026-04-19T10:30:00Z',
      updatedAt: '2026-04-19T10:30:00Z',
    },
  ],
}

const receiptRecord = {
  id: 'receipt-1',
  recordNo: 'RCV-001',
  ledgerId: 'receivable-1',
  amount: 60,
  currency: 'CNY',
  paymentMethod: 'BANK',
  paymentTerm: 'NET30',
  recordDate: '2026-04-19',
  receivedAt: '2026-04-19T10:30',
  receiptAccount: '招商银行-对公户',
  status: 'CONFIRMED',
  referenceNo: 'REF-001',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
  evidences: [],
}

beforeEach(() => {
  apiFetchMock.mockReset()
})

describe('ReceivableLedgerDetailService', () => {
  it('deserializes receivable detail responses with the locked contract', async () => {
    apiFetchMock.mockResolvedValue(detail)

    await expect(getReceivableLedgerDetail('receivable-1')).resolves.toEqual(detail)
    expect(apiFetchMock).toHaveBeenCalledWith('/receivables/receivable-1')
  })

  it('rejects receivable detail responses that omit allocations', async () => {
    const { allocations: _allocations, ...withoutAllocations } = detail
    apiFetchMock.mockResolvedValue(withoutAllocations)

    await expect(getReceivableLedgerDetail('receivable-1')).rejects.toThrow()
  })

  it('deserializes create receipt responses with the locked contract', async () => {
    const response = {
      ledger: detail,
      record: receiptRecord,
      allocations: [],
    }
    const payload = {
      amount: 60,
      paymentMethod: 'BANK',
      receivedAt: '2026-04-19T10:30',
      receiptAccount: '招商银行-对公户',
      allocations: [{ ledgerId: 'receivable-1', allocatedAmount: 60 }],
    }
    apiFetchMock.mockResolvedValue(response)

    await expect(createReceiptRecord('receivable-1', payload)).resolves.toEqual(response)
    expect(apiFetchMock).toHaveBeenCalledWith('/receivables/receivable-1/receipts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('rejects malformed create receipt payloads before sending the request', async () => {
    await expect(createReceiptRecord('receivable-1', { amount: 60 } as never)).rejects.toThrow()
    expect(apiFetchMock).not.toHaveBeenCalled()
  })
})
