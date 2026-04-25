import type { SettlementAllocationHistoryGroup } from './components/settlement-allocation-history-section'
import type { SettlementAllocationDraft } from './services/settlement-record-payload'

export type SettlementDetailLike = {
  id: string
  documentNo: string
  currency?: string
  invoiceAmount?: number
  outstandingAmount: number
  status?: string
}

export type SettlementRecordLike = {
  id: string
  recordNo: string
  recordDate: string
  amount: number
  paymentMethod: string
  receivedAt?: string
  receiptAccount?: string
  status: string
  evidences: Array<unknown>
}

export type SettlementAllocationLike = {
  id: string
  ledgerId: string
  sequenceNo: number
  allocatedAmount: number
  remark: string
  paymentRecordId?: string
  receiptRecordId?: string
}

export type SettlementLocalLedgerLike = {
  id: string
  documentNo: string
  currency?: string
  outstandingAmount: number
}

export type SettlementRemoteLedgerLike = {
  id: string
  documentNo: string
  partnerName: string
  outstandingAmount: number
  status: string
  currency: string
}

export type SettlementAllocationMode = 'single-ledger' | 'multi-ledger'

export interface SettlementLedgerSearchHookParams {
  keyword: string
  status: string
  currency: string
  outstandingMin: string
  outstandingMax: string
  sortBy: string
  sortOrder: string
}

export interface SettlementLedgerSearchHookResult<
  TRemoteLedger extends SettlementRemoteLedgerLike,
> {
  data: TRemoteLedger[] | undefined
  isFetching: boolean
}

export interface SettlementLedgerDetailDialogConfig<
  TDetail extends SettlementDetailLike,
  TLocalLedger extends SettlementLocalLedgerLike,
> {
  dialogTitle: string
  ledgerKindLabel: string
  actionLabel: string
  partnerLabel: string
  amountLabel: string
  fieldPrefix: string
  relationKey: 'paymentRecordId' | 'receiptRecordId'
  recordType: 'payment' | 'receipt'
  allocationMode?: SettlementAllocationMode
  uploadPath: string
  getDetailPartnerName: (detail: TDetail) => string
  getLocalLedgerPartnerName: (ledger: TLocalLedger) => string
  summaryAmountLabel?: string
  getDetailSummaryAmount?: (detail: TDetail) => number
}

export interface SettlementLedgerDetailDialogViewModel {
  paymentMethod: string
  setPaymentMethod: (value: string) => void
  recordDate: string
  setRecordDate: (value: string) => void
  receivedAt: string
  setReceivedAt: (value: string) => void
  receiptAccount: string
  setReceiptAccount: (value: string) => void
  referenceNo: string
  setReferenceNo: (value: string) => void
  allocations: SettlementAllocationDraft[]
  ledgerSearchTerm: string
  setLedgerSearchTerm: (value: string) => void
  ledgerStatusFilter: string
  setLedgerStatusFilter: (value: string) => void
  ledgerCurrencyFilter: string
  setLedgerCurrencyFilter: (value: string) => void
  ledgerOutstandingMin: string
  setLedgerOutstandingMin: (value: string) => void
  ledgerOutstandingMax: string
  setLedgerOutstandingMax: (value: string) => void
  ledgerSortBy: string
  setLedgerSortBy: (value: string) => void
  ledgerSortOrder: string
  setLedgerSortOrder: (value: string) => void
  isLedgerSearchDialogOpen: boolean
  setIsLedgerSearchDialogOpen: (value: boolean) => void
  historySearchTerm: string
  setHistorySearchTerm: (value: string) => void
  selectedRecordId: string | null
  setSelectedRecordId: (value: string | null) => void
  showOnlyMissingEvidenceRecords: boolean
  setShowOnlyMissingEvidenceRecords: (
    value: boolean | ((current: boolean) => boolean)
  ) => void
  totalAllocatedAmount: number
  canSubmit: boolean
  activeAllocationLedgerId: string
  currencyOptions: Array<{ code: string }>
  currencyCode: string
  paymentMethodOptions: Array<{ code: string; name: string }>
  isCurrencyOptionsUnavailable: boolean
  summaryItems: Array<{ label: string; value: string | number }>
  ledgerDisplayMap: Map<string, string>
  filteredRecords: SettlementRecordLike[]
  filteredHistoryGroups: SettlementAllocationHistoryGroup[]
  displayLedgerOptions: Array<{
    id: string
    documentNo: string
    displayName: string
  }>
  remoteLedgerOptions: SettlementRemoteLedgerLike[]
  isSearchingLedgers: boolean
  handleOpenChange: (nextOpen: boolean) => void
  handleSubmit: () => Promise<void>
  addAllocationRow: () => void
  removeAllocationRow: (sequenceNo: number) => void
  updateAllocationRow: (
    sequenceNo: number,
    patch: Partial<SettlementAllocationDraft>
  ) => void
  openLedgerSearchDialog: (sequenceNo: number) => void
  handleLedgerSelected: (ledgerId: string) => void
  actionRecordLabel: string
  fieldPrefix: string
}
