// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useSettlementLedgerDetailDialogViewModel } from './use-settlement-ledger-detail-dialog-view-model'
import type { SettlementLedgerDetailDialogConfig } from '../types'

type DetailStub = {
  id: string
  documentNo: string
  currency: string
  supplierName: string
  invoiceAmount: number
  outstandingAmount: number
}

type LocalLedgerStub = {
  id: string
  documentNo: string
  currency: string
  supplierName: string
  outstandingAmount: number
}

const payableConfig = {
  dialogTitle: '应付详情',
  ledgerKindLabel: '应付',
  actionLabel: '付款',
  partnerLabel: '供应商',
  amountLabel: '未付',
  summaryAmountLabel: '开票金额',
  fieldPrefix: 'payable',
  relationKey: 'paymentRecordId',
  recordType: 'payment',
  uploadPath: '/purchase/evidence/upload',
  getDetailPartnerName: (item: DetailStub) => item.supplierName,
  getLocalLedgerPartnerName: (item: LocalLedgerStub) => item.supplierName,
  getDetailSummaryAmount: (item: DetailStub) => item.invoiceAmount,
} satisfies SettlementLedgerDetailDialogConfig<DetailStub, LocalLedgerStub>

function buildDetail(): DetailStub {
  return {
    id: 'ledger-main',
    documentNo: 'PO-001',
    currency: 'CNY',
    supplierName: '示例供应商',
    invoiceAmount: 320,
    outstandingAmount: 120,
  }
}

describe('use-settlement-ledger-detail-dialog-view-model', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('derives summary, record filtering and ledger search from config-driven data', () => {
    const searchHook = vi.fn(({ keyword }: { keyword: string }) => ({
      data:
        keyword.length >= 2
          ? [
              {
                id: 'remote-ledger',
                documentNo: 'PO-REMOTE',
                partnerName: '远端供应商',
                outstandingAmount: 260,
                status: 'OPEN',
                currency: 'CNY',
              },
            ]
          : undefined,
      isFetching: false,
    }))

    const { result } = renderHook(() =>
      useSettlementLedgerDetailDialogViewModel({
        ledgerId: 'ledger-main',
        detail: buildDetail(),
        records: [
          {
            id: 'payment-1',
            recordNo: 'PAY-001',
            recordDate: '2026-04-19',
            amount: 80,
            paymentMethod: 'BANK',
            status: 'POSTED',
            evidences: [],
          },
          {
            id: 'payment-2',
            recordNo: 'PAY-002',
            recordDate: '2026-04-20',
            amount: 40,
            paymentMethod: 'BANK',
            status: 'POSTED',
            evidences: [{ id: 'e-1' }],
          },
        ],
        allocationHistory: [
          {
            id: 'allocation-1',
            paymentRecordId: 'payment-1',
            ledgerId: 'ledger-main',
            sequenceNo: 1,
            allocatedAmount: 80,
            remark: '首笔分摊',
          },
        ],
        ledgerOptions: [
          {
            id: 'ledger-main',
            documentNo: 'PO-001',
            currency: 'CNY',
            supplierName: '示例供应商',
            outstandingAmount: 120,
          },
        ],
        currencies: [{ code: 'CNY', status: 'Active' }],
        paymentMethods: [{ code: 'BANK', name: '银行转账' }],
        isCurrencyLoading: false,
        onOpenChange: vi.fn(),
        onSubmit: vi.fn(async () => undefined),
        config: payableConfig,
        useSearchLedgers: searchHook,
      })
    )

    expect(result.current.summaryItems).toEqual([
      { label: '单据编号', value: 'PO-001' },
      { label: '供应商', value: '示例供应商' },
      { label: '开票金额', value: 'CNY 320.00' },
      { label: '未付金额', value: 'CNY 120.00' },
    ])
    expect(result.current.filteredRecords).toHaveLength(2)

    act(() => {
      result.current.setShowOnlyMissingEvidenceRecords(true)
    })
    expect(result.current.filteredRecords.map((item) => item.id)).toEqual(['payment-1'])

    act(() => {
      result.current.setHistorySearchTerm('首笔')
    })
    expect(result.current.filteredHistoryGroups).toHaveLength(1)
    expect(result.current.filteredHistoryGroups[0]?.allocations).toHaveLength(1)

    act(() => {
      result.current.setLedgerSearchTerm('PO')
    })
    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(result.current.displayLedgerOptions).toEqual([
      {
        id: 'remote-ledger',
        documentNo: 'PO-REMOTE',
        displayName: 'PO-REMOTE / 远端供应商 / 未付 CNY 260.00',
      },
    ])
  })

  it('submits normalized payload and resets editable state after success', async () => {
    const onSubmit = vi.fn(async () => undefined)

    const { result } = renderHook(() =>
      useSettlementLedgerDetailDialogViewModel({
        ledgerId: 'ledger-main',
        detail: buildDetail(),
        records: [],
        allocationHistory: [],
        ledgerOptions: [],
        currencies: [{ code: 'CNY', status: 'Active' }],
        paymentMethods: [{ code: 'BANK', name: '银行转账' }],
        isCurrencyLoading: false,
        onOpenChange: vi.fn(),
        onSubmit,
        config: payableConfig,
        useSearchLedgers: () => ({ data: [], isFetching: false }),
      })
    )

    act(() => {
      result.current.setRecordDate(' 2026-04-19 ')
      result.current.setReferenceNo(' REF-001 ')
      result.current.updateAllocationRow(1, {
        allocatedAmount: '80',
        remark: ' 首笔 ',
      })
    })

    expect(result.current.canSubmit).toBe(true)

    await act(async () => {
      await result.current.handleSubmit()
    })

    expect(onSubmit).toHaveBeenCalledWith({
      amount: 80,
      recordDate: '2026-04-19',
      referenceNo: 'REF-001',
      allocations: [
        {
          ledgerId: 'ledger-main',
          allocatedAmount: 80,
          sequenceNo: 1,
          remark: '首笔',
        },
      ],
    })
    expect(result.current.referenceNo).toBe('')
    expect(result.current.recordDate).toBe('')
    expect(result.current.allocations).toEqual([
      {
        ledgerId: 'ledger-main',
        allocatedAmount: '',
        remark: '',
        sequenceNo: 1,
      },
    ])
  })
})
