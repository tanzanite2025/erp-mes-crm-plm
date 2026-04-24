import { describe, expect, it } from 'vitest'

import {
  deserializeCreateReceiptRecordResponseApiDTO,
  deserializeReceivableDetailApiDTO,
  deserializeReceivableListPageApiDTO,
} from './receivable-api-dto'

const payload = {
  items: [
    {
      id: 'receivable-1',
      documentNo: 'AR-001',
      customerName: 'Acme Customer',
      currency: 'CNY',
      orderAmount: 100,
      receivedAmount: 40,
      outstandingAmount: 60,
      dueDate: '2026-04-30',
      agingBucket: 'CURRENT',
      status: 'OPEN',
      createdAt: '2026-04-19T00:00:00Z',
      updatedAt: '2026-04-19T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  pageSize: 50,
  summary: {
    totalReceivable: 100,
    overdueReceivable: 0,
    pendingReceiptCount: 1,
  },
}

const allocation = {
  id: 'allocation-1',
  ledgerId: 'receivable-1',
  receiptRecordId: 'receipt-1',
  paymentRecordId: '',
  allocatedAmount: 60,
  sequenceNo: 1,
  remark: 'receipt',
  operator: 'system',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
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

const salesReturnActualAmountRecord = {
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
}

const detail = {
  ...payload.items[0],
  outstandingAmount: 45,
  sourceType: 'SALES_ORDER',
  sourceRefId: 'receivable-1',
  customerId: 'CUST-001',
  version: 1,
  receiptRecords: [receiptRecord],
  allocations: [allocation],
  returnAdjustmentAmount: 15,
  salesReturnActualAmountRecords: [salesReturnActualAmountRecord],
}

describe('receivable api dto', () => {
  it('accepts the locked receivable list page shape', () => {
    expect(deserializeReceivableListPageApiDTO(payload)).toEqual(payload)
  })

  it('rejects array payloads instead of treating them as pages', () => {
    expect(() => deserializeReceivableListPageApiDTO(payload.items)).toThrow()
  })

  it('requires summary and pagination metadata', () => {
    const { summary: _summary, ...withoutSummary } = payload
    const { pageSize: _pageSize, ...withoutPageSize } = payload

    expect(() => deserializeReceivableListPageApiDTO(withoutSummary)).toThrow()
    expect(() => deserializeReceivableListPageApiDTO(withoutPageSize)).toThrow()
  })

  it('rejects extra page, item, and summary fields', () => {
    expect(() =>
      deserializeReceivableListPageApiDTO({
        ...payload,
        debug: true,
      })
    ).toThrow()

    expect(() =>
      deserializeReceivableListPageApiDTO({
        ...payload,
        items: [{ ...payload.items[0], customerId: 'CUST-001' }],
      })
    ).toThrow()

    expect(() =>
      deserializeReceivableListPageApiDTO({
        ...payload,
        summary: { ...payload.summary, settledReceivable: 40 },
      })
    ).toThrow()
  })

  it('rejects unknown receivable ledger status and aging bucket values', () => {
    expect(() =>
      deserializeReceivableListPageApiDTO({
        ...payload,
        items: [{ ...payload.items[0], status: 'PROCESSING' }],
      })
    ).toThrow()

    expect(() =>
      deserializeReceivableListPageApiDTO({
        ...payload,
        items: [{ ...payload.items[0], agingBucket: 'LATE' }],
      })
    ).toThrow()
  })

  it('accepts the locked receivable detail shape', () => {
    expect(deserializeReceivableDetailApiDTO(detail)).toEqual(detail)
  })

  it('rejects receivable detail payloads that omit record collections', () => {
    const { receiptRecords: _receiptRecords, ...withoutReceiptRecords } = detail

    expect(() => deserializeReceivableDetailApiDTO(withoutReceiptRecords)).toThrow()
  })

  it('accepts the locked create receipt response shape', () => {
    const response = {
      ledger: detail,
      record: receiptRecord,
      allocations: [allocation],
    }

    expect(deserializeCreateReceiptRecordResponseApiDTO(response)).toEqual(response)
  })

  it('rejects extra fields in create receipt response records', () => {
    expect(() =>
      deserializeCreateReceiptRecordResponseApiDTO({
        ledger: detail,
        record: { ...receiptRecord, debug: true },
        allocations: [allocation],
      })
    ).toThrow()
  })
})
