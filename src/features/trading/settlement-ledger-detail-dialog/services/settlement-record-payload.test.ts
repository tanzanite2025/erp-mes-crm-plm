import { describe, expect, it } from 'vitest'

import { buildSettlementRecordPayload } from './settlement-record-payload'

describe('settlement record payload builder', () => {
  it('normalizes optional strings and allocation fields before submit', () => {
    expect(
      buildSettlementRecordPayload({
        amount: 80,
        paymentMethod: ' BANK ',
        recordDate: ' 2026-04-19 ',
        receivedAt: ' 2026-04-19T10:30 ',
        receiptAccount: ' 招商银行-对公户 ',
        referenceNo: ' REF-001 ',
        allocations: [
          {
            ledgerId: ' ledger-1 ',
            allocatedAmount: '80',
            remark: ' full ',
            sequenceNo: 0,
          },
        ],
      })
    ).toEqual({
      amount: 80,
      paymentMethod: 'BANK',
      recordDate: '2026-04-19',
      receivedAt: '2026-04-19T10:30',
      receiptAccount: '招商银行-对公户',
      referenceNo: 'REF-001',
      allocations: [
        {
          ledgerId: 'ledger-1',
          allocatedAmount: 80,
          sequenceNo: 1,
          remark: 'full',
        },
      ],
    })
  })

  it('omits blank optional fields instead of sending empty strings', () => {
    expect(
      buildSettlementRecordPayload({
        amount: 60,
        paymentMethod: '   ',
        recordDate: '',
        receivedAt: '',
        receiptAccount: '   ',
        referenceNo: '   ',
        allocations: [
          {
            ledgerId: 'ledger-1',
            allocatedAmount: '60',
            remark: '   ',
            sequenceNo: 2,
          },
        ],
      })
    ).toEqual({
      amount: 60,
      allocations: [
        {
          ledgerId: 'ledger-1',
          allocatedAmount: 60,
          sequenceNo: 2,
        },
      ],
    })
  })

  it('rejects malformed form data before the request is sent', () => {
    expect(() =>
      buildSettlementRecordPayload({
        amount: 60,
        paymentMethod: '',
        recordDate: '',
        receivedAt: '',
        receiptAccount: '',
        referenceNo: '',
        allocations: [],
      })
    ).toThrow()
  })
})
