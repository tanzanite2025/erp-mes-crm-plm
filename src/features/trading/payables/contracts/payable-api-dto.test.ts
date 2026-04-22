import { describe, expect, it } from 'vitest'

import {
  deserializeCreatePaymentRecordResponseApiDTO,
  deserializePayableDetailApiDTO,
  deserializePayableListPageApiDTO,
} from './payable-api-dto'

const payload = {
  items: [
    {
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
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
  summary: {
    totalPayable: 100,
    overduePayable: 0,
    pendingPaymentCount: 1,
  },
}

const allocation = {
  id: 'allocation-1',
  ledgerId: 'payable-1',
  receiptRecordId: '',
  paymentRecordId: 'payment-1',
  allocatedAmount: 60,
  sequenceNo: 1,
  remark: 'pay',
  operator: 'system',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
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

const detail = {
  ...payload.items[0],
  sourceType: 'PURCHASE_ORDER',
  sourceRefId: 'PO-001',
  supplierId: 'SUP-001',
  version: 1,
  paymentRecords: [paymentRecord],
  allocations: [allocation],
}

describe('payable api dto', () => {
  it('accepts the locked payable list page shape', () => {
    expect(deserializePayableListPageApiDTO(payload)).toEqual(payload)
  })

  it('rejects array payloads instead of treating them as pages', () => {
    expect(() => deserializePayableListPageApiDTO(payload.items)).toThrow()
  })

  it('requires summary and pagination metadata', () => {
    const { summary: _summary, ...withoutSummary } = payload
    const { pageSize: _pageSize, ...withoutPageSize } = payload

    expect(() => deserializePayableListPageApiDTO(withoutSummary)).toThrow()
    expect(() => deserializePayableListPageApiDTO(withoutPageSize)).toThrow()
  })

  it('rejects extra page, item, and summary fields', () => {
    expect(() =>
      deserializePayableListPageApiDTO({
        ...payload,
        debug: true,
      })
    ).toThrow()

    expect(() =>
      deserializePayableListPageApiDTO({
        ...payload,
        items: [{ ...payload.items[0], supplierId: 'SUP-001' }],
      })
    ).toThrow()

    expect(() =>
      deserializePayableListPageApiDTO({
        ...payload,
        summary: { ...payload.summary, settledPayable: 40 },
      })
    ).toThrow()
  })

  it('accepts the locked payable detail shape', () => {
    expect(deserializePayableDetailApiDTO(detail)).toEqual(detail)
  })

  it('rejects payable detail payloads that omit record collections', () => {
    const { paymentRecords: _paymentRecords, ...withoutPaymentRecords } = detail

    expect(() => deserializePayableDetailApiDTO(withoutPaymentRecords)).toThrow()
  })

  it('accepts the locked create payment response shape', () => {
    const response = {
      ledger: detail,
      record: paymentRecord,
      allocations: [allocation],
    }

    expect(deserializeCreatePaymentRecordResponseApiDTO(response)).toEqual(response)
  })

  it('rejects extra fields in create payment response records', () => {
    expect(() =>
      deserializeCreatePaymentRecordResponseApiDTO({
        ledger: detail,
        record: { ...paymentRecord, debug: true },
        allocations: [allocation],
      })
    ).toThrow()
  })
})
