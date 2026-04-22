import { describe, expect, it } from 'vitest'

import {
  deserializeCreateSettlementRecordApiDTO,
  deserializeSettlementAllocationApiDTO,
  deserializeSettlementRecordApiDTO,
} from './settlement-record-api-dto'

const allocationRequest = {
  ledgerId: 'ledger-1',
  allocatedAmount: 60,
  sequenceNo: 1,
  remark: 'full',
}

const record = {
  id: 'record-1',
  recordNo: 'SET-001',
  ledgerId: 'ledger-1',
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

const allocation = {
  id: 'allocation-1',
  ledgerId: 'ledger-1',
  receiptRecordId: '',
  paymentRecordId: 'record-1',
  allocatedAmount: 60,
  sequenceNo: 1,
  remark: 'full',
  operator: 'system',
  createdAt: '2026-04-19T00:00:00Z',
  updatedAt: '2026-04-19T00:00:00Z',
}

describe('settlement record api dto', () => {
  it('accepts the locked create settlement record request shape', () => {
    expect(
      deserializeCreateSettlementRecordApiDTO({
        amount: 60,
        currency: 'CNY',
        paymentMethod: 'BANK',
        paymentTerm: 'NET30',
        recordDate: '2026-04-19',
        receivedAt: '2026-04-19T10:30',
        receiptAccount: '招商银行-对公户',
        referenceNo: 'REF-001',
        allocations: [allocationRequest],
      })
    ).toEqual({
      amount: 60,
      currency: 'CNY',
      paymentMethod: 'BANK',
      paymentTerm: 'NET30',
      recordDate: '2026-04-19',
      receivedAt: '2026-04-19T10:30',
      receiptAccount: '招商银行-对公户',
      referenceNo: 'REF-001',
      allocations: [allocationRequest],
    })
  })

  it('rejects extra fields in create settlement record requests', () => {
    expect(() =>
      deserializeCreateSettlementRecordApiDTO({
        amount: 60,
        allocations: [{ ...allocationRequest, extra: true }],
      })
    ).toThrow()
  })

  it('accepts the locked settlement record and allocation shapes', () => {
    expect(deserializeSettlementRecordApiDTO(record)).toEqual(record)
    expect(deserializeSettlementAllocationApiDTO(allocation)).toEqual(allocation)
  })

  it('rejects extra fields in settlement record and allocation payloads', () => {
    expect(() =>
      deserializeSettlementRecordApiDTO({
        ...record,
        debug: true,
      })
    ).toThrow()

    expect(() =>
      deserializeSettlementAllocationApiDTO({
        ...allocation,
        debug: true,
      })
    ).toThrow()
  })
})
