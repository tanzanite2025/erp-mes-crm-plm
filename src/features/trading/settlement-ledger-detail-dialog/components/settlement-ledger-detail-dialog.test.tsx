// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettlementLedgerDetailDialog } from './settlement-ledger-detail-dialog'
import type {
  SettlementLedgerDetailDialogConfig,
  SettlementLedgerDetailDialogViewModel,
} from '../types'

const {
  useSettlementLedgerDetailDialogViewModelMock,
  dialogMock,
  bodyMock,
  footerMock,
  searchContainerMock,
} = vi.hoisted(() => ({
  useSettlementLedgerDetailDialogViewModelMock: vi.fn(),
  dialogMock: vi.fn(),
  bodyMock: vi.fn(),
  footerMock: vi.fn(),
  searchContainerMock: vi.fn(),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) => {
    dialogMock({ open, onOpenChange })
    return open ? (
      <div data-testid='dialog-root'>
        <button type='button' onClick={() => onOpenChange(false)}>
          触发关闭
        </button>
        {children}
      </div>
    ) : null
  },
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('../hooks/use-settlement-ledger-detail-dialog-view-model', () => ({
  useSettlementLedgerDetailDialogViewModel: useSettlementLedgerDetailDialogViewModelMock,
}))

vi.mock('./settlement-ledger-detail-dialog-body', () => ({
  SettlementLedgerDetailDialogBody: (props: unknown) => {
    bodyMock(props)
    return <div data-testid='detail-body' />
  },
}))

vi.mock('./settlement-ledger-detail-dialog-footer', () => ({
  SettlementLedgerDetailDialogFooter: (props: unknown) => {
    footerMock(props)
    return <div data-testid='detail-footer' />
  },
}))

vi.mock('./settlement-ledger-search-dialog-container', () => ({
  SettlementLedgerSearchDialogContainer: (props: unknown) => {
    searchContainerMock(props)
    return <div data-testid='search-container' />
  },
}))

type DetailStub = {
  id: string
  documentNo: string
  supplierName: string
  invoiceAmount: number
  outstandingAmount: number
}

type LocalLedgerStub = {
  id: string
  documentNo: string
  supplierName: string
  outstandingAmount: number
}

const config = {
  dialogTitle: '应付详情',
  ledgerKindLabel: '应付',
  actionLabel: '付款',
  partnerLabel: '供应商',
  amountLabel: '未付',
  fieldPrefix: 'payable',
  relationKey: 'paymentRecordId',
  recordType: 'payment',
  uploadPath: '/purchase/evidence/upload',
  getDetailPartnerName: (detail: DetailStub) => detail.supplierName,
  getLocalLedgerPartnerName: (ledger: LocalLedgerStub) => ledger.supplierName,
} satisfies SettlementLedgerDetailDialogConfig<DetailStub, LocalLedgerStub>

function createViewModel(): SettlementLedgerDetailDialogViewModel {
  return {
    paymentMethod: 'BANK',
    setPaymentMethod: vi.fn(),
    recordDate: '2026-04-19',
    setRecordDate: vi.fn(),
    receivedAt: '',
    setReceivedAt: vi.fn(),
    receiptAccount: '6222',
    setReceiptAccount: vi.fn(),
    referenceNo: 'REF-001',
    setReferenceNo: vi.fn(),
    allocations: [{ ledgerId: 'ledger-1', allocatedAmount: '80', remark: '', sequenceNo: 1 }],
    ledgerSearchTerm: 'PO',
    setLedgerSearchTerm: vi.fn(),
    ledgerStatusFilter: 'OPEN',
    setLedgerStatusFilter: vi.fn(),
    ledgerCurrencyFilter: 'CNY',
    setLedgerCurrencyFilter: vi.fn(),
    ledgerOutstandingMin: '10',
    setLedgerOutstandingMin: vi.fn(),
    ledgerOutstandingMax: '100',
    setLedgerOutstandingMax: vi.fn(),
    ledgerSortBy: 'updated_at',
    setLedgerSortBy: vi.fn(),
    ledgerSortOrder: 'desc',
    setLedgerSortOrder: vi.fn(),
    isLedgerSearchDialogOpen: true,
    setIsLedgerSearchDialogOpen: vi.fn(),
    historySearchTerm: '首笔',
    setHistorySearchTerm: vi.fn(),
    selectedRecordId: 'payment-1',
    setSelectedRecordId: vi.fn(),
    showOnlyMissingEvidenceRecords: false,
    setShowOnlyMissingEvidenceRecords: vi.fn(),
    totalAllocatedAmount: 80,
    canSubmit: true,
    activeAllocationLedgerId: 'ledger-1',
    currencyOptions: [{ code: 'CNY' }],
    currencyCode: 'CNY',
    paymentMethodOptions: [{ code: 'BANK', name: '银行转账' }],
    isCurrencyOptionsUnavailable: false,
    summaryItems: [{ label: '单据编号', value: 'PO-001' }],
    ledgerDisplayMap: new Map([['ledger-1', 'PO-001 / 示例供应商 / 未付 80']]),
    filteredRecords: [
      {
        id: 'payment-1',
        recordNo: 'PAY-001',
        amount: 80,
        recordDate: '2026-04-19',
        paymentMethod: 'BANK',
        status: 'POSTED',
        evidences: [],
      },
    ],
    filteredHistoryGroups: [],
    displayLedgerOptions: [{ id: 'ledger-1', documentNo: 'PO-001', displayName: 'PO-001 / 示例供应商 / 未付 80' }],
    remoteLedgerOptions: [
      {
        id: 'ledger-1',
        documentNo: 'PO-001',
        partnerName: '示例供应商',
        outstandingAmount: 80,
        status: 'OPEN',
        currency: 'CNY',
      },
    ],
    isSearchingLedgers: false,
    handleOpenChange: vi.fn(),
    handleSubmit: vi.fn(async () => undefined),
    addAllocationRow: vi.fn(),
    removeAllocationRow: vi.fn(),
    updateAllocationRow: vi.fn(),
    openLedgerSearchDialog: vi.fn(),
    handleLedgerSelected: vi.fn(),
    actionRecordLabel: '付款记录',
    fieldPrefix: 'payable',
  }
}

function renderDialog(
  overrides?: Partial<SettlementLedgerDetailDialogViewModel>,
  options?: {
    config?: SettlementLedgerDetailDialogConfig<DetailStub, LocalLedgerStub>
    allocationHistory?: Array<{
      id: string
      ledgerId: string
      sequenceNo: number
      allocatedAmount: number
      remark: string
      paymentRecordId?: string
      receiptRecordId?: string
    }>
    isCurrencyLoading?: boolean
    isDetailLoading?: boolean
    isSubmitPending?: boolean
  }
) {
  const vm = { ...createViewModel(), ...overrides }
  useSettlementLedgerDetailDialogViewModelMock.mockReturnValue(vm)

  render(
    <SettlementLedgerDetailDialog
      open
      ledgerId='ledger-main'
      onOpenChange={vi.fn()}
      detail={{
        id: 'ledger-main',
        documentNo: 'PO-001',
        supplierName: '示例供应商',
        invoiceAmount: 120,
        outstandingAmount: 80,
      }}
      records={[]}
      allocationHistory={options?.allocationHistory ?? []}
      ledgerOptions={[]}
      currencies={[]}
      paymentMethods={[{ code: 'BANK', name: '银行转账' }]}
      isCurrencyLoading={options?.isCurrencyLoading ?? false}
      isDetailLoading={options?.isDetailLoading ?? false}
      isSubmitPending={options?.isSubmitPending ?? false}
      onSubmit={vi.fn(async () => undefined)}
      useSearchLedgers={() => ({ data: [], isFetching: false })}
      config={options?.config ?? config}
    />
  )

  return vm
}

describe('settlement-ledger-detail-dialog', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders configured title, composed description, child sections and search dialog props', () => {
    renderDialog()

    expect(screen.getByRole('heading', { name: '应付详情' })).toBeTruthy()
    expect(screen.getByText('查看台账明细，并登记一笔付款记录。')).toBeTruthy()
    expect(screen.getByTestId('detail-body')).toBeTruthy()
    expect(screen.getByTestId('detail-footer')).toBeTruthy()
    expect(screen.getByTestId('search-container')).toBeTruthy()

    expect(bodyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vm: expect.objectContaining({
          summaryItems: [{ label: '单据编号', value: 'PO-001' }],
        }),
        config,
        showDetailedFields: false,
        isCurrencyLoading: false,
        allocationHistoryCount: 0,
      })
    )
    expect(footerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vm: expect.objectContaining({ canSubmit: true }),
        actionLabel: '付款',
        isSubmitPending: false,
        isDetailLoading: false,
      })
    )
    expect(searchContainerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vm: expect.objectContaining({ activeAllocationLedgerId: 'ledger-1' }),
        ledgerKindLabel: '应付',
        partnerLabel: '供应商',
        amountLabel: '未付',
      })
    )
  })

  it('wires dialog onOpenChange to vm.handleOpenChange', async () => {
    const user = userEvent.setup()
    const handleOpenChange = vi.fn()

    renderDialog({
      handleOpenChange,
    })

    expect(dialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        onOpenChange: handleOpenChange,
      })
    )

    await user.click(screen.getByRole('button', { name: '触发关闭' }))
    expect(handleOpenChange).toHaveBeenCalledWith(false)
  })

  it('passes receipt-specific and loading props to body and footer', () => {
    const receiptConfig = {
      ...config,
      dialogTitle: '应收详情',
      ledgerKindLabel: '应收',
      actionLabel: '收款',
      partnerLabel: '客户',
      amountLabel: '未收',
      fieldPrefix: 'receivable',
      relationKey: 'receiptRecordId' as const,
      recordType: 'receipt' as const,
      uploadPath: '/sales/evidence/upload',
      getDetailPartnerName: (detail: DetailStub) => detail.supplierName,
      getLocalLedgerPartnerName: (ledger: LocalLedgerStub) => ledger.supplierName,
    }

    const vm = renderDialog(undefined, {
      config: receiptConfig,
      allocationHistory: [
        {
          id: 'allocation-1',
          ledgerId: 'ledger-1',
          sequenceNo: 1,
          allocatedAmount: 80,
          remark: '首笔',
          receiptRecordId: 'receipt-1',
        },
      ],
      isCurrencyLoading: true,
      isDetailLoading: true,
      isSubmitPending: true,
    })

    expect(bodyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vm,
        config: receiptConfig,
        showDetailedFields: true,
        isCurrencyLoading: true,
        allocationHistoryCount: 1,
      })
    )
    expect(footerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vm,
        actionLabel: '收款',
        isSubmitPending: true,
        isDetailLoading: true,
      })
    )
    expect(searchContainerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        vm,
        ledgerKindLabel: '应收',
        partnerLabel: '客户',
        amountLabel: '未收',
      })
    )
  })
})
