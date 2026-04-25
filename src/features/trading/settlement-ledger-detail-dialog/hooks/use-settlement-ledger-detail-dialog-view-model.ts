import type { buildSettlementRecordPayload } from '../services/settlement-record-payload'
import type {
  SettlementAllocationLike,
  SettlementDetailLike,
  SettlementLedgerDetailDialogConfig,
  SettlementLedgerDetailDialogViewModel,
  SettlementLedgerSearchHookParams,
  SettlementLedgerSearchHookResult,
  SettlementLocalLedgerLike,
  SettlementRecordLike,
  SettlementRemoteLedgerLike,
} from '../types'
import { useSettlementAllocationHistory } from './use-settlement-allocation-history'
import { useSettlementLedgerSearch } from './use-settlement-ledger-search'
import { useSettlementRecordDialogState } from './use-settlement-record-dialog-state'
import { useSettlementSubmit } from './use-settlement-submit'
import { useSettlementSummaryItems } from './use-settlement-summary-items'

interface UseSettlementLedgerDetailDialogViewModelParams<
  TDetail extends SettlementDetailLike,
  TRecord extends SettlementRecordLike,
  TAllocation extends SettlementAllocationLike,
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
> {
  ledgerId: string | null
  detail: TDetail | null | undefined
  records: TRecord[]
  allocationHistory: TAllocation[]
  ledgerOptions: TLocalLedger[]
  currencies: Array<{ code: string; status: string }>
  paymentMethods: Array<{ code: string; name: string }>
  isCurrencyLoading: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    payload: ReturnType<typeof buildSettlementRecordPayload>
  ) => Promise<void>
  config: SettlementLedgerDetailDialogConfig<TDetail, TLocalLedger>
  useSearchLedgers: (
    params: SettlementLedgerSearchHookParams
  ) => SettlementLedgerSearchHookResult<TRemoteLedger>
}

export function useSettlementLedgerDetailDialogViewModel<
  TDetail extends SettlementDetailLike,
  TRecord extends SettlementRecordLike,
  TAllocation extends SettlementAllocationLike,
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
>({
  ledgerId,
  detail,
  records,
  allocationHistory,
  ledgerOptions,
  currencies,
  paymentMethods,
  isCurrencyLoading,
  onOpenChange,
  onSubmit,
  config,
  useSearchLedgers,
}: UseSettlementLedgerDetailDialogViewModelParams<
  TDetail,
  TRecord,
  TAllocation,
  TLocalLedger,
  TRemoteLedger
>): SettlementLedgerDetailDialogViewModel {
  const {
    paymentMethod,
    setPaymentMethod,
    recordDate,
    setRecordDate,
    receivedAt,
    setReceivedAt,
    receiptAccount,
    setReceiptAccount,
    referenceNo,
    setReferenceNo,
    allocations,
    ledgerSearchTerm,
    setLedgerSearchTerm,
    debouncedLedgerSearchTerm,
    ledgerStatusFilter,
    setLedgerStatusFilter,
    ledgerCurrencyFilter,
    setLedgerCurrencyFilter,
    ledgerOutstandingMin,
    setLedgerOutstandingMin,
    ledgerOutstandingMax,
    setLedgerOutstandingMax,
    ledgerSortBy,
    setLedgerSortBy,
    ledgerSortOrder,
    setLedgerSortOrder,
    isLedgerSearchDialogOpen,
    setIsLedgerSearchDialogOpen,
    historySearchTerm,
    setHistorySearchTerm,
    selectedRecordId,
    setSelectedRecordId,
    showOnlyMissingEvidenceRecords,
    setShowOnlyMissingEvidenceRecords,
    totalAllocatedAmount,
    canSubmit,
    resetForm,
    addAllocationRow,
    removeAllocationRow,
    updateAllocationRow,
    openLedgerSearchDialog,
    activeAllocation,
    handleLedgerSelected,
  } = useSettlementRecordDialogState(ledgerId)

  const { remoteLedgerOptions, displayLedgerOptions, isSearchingLedgers } =
    useSettlementLedgerSearch<TLocalLedger, TRemoteLedger>({
      ledgerSearchTerm,
      debouncedLedgerSearchTerm,
      ledgerStatusFilter,
      ledgerCurrencyFilter,
      ledgerOutstandingMin,
      ledgerOutstandingMax,
      ledgerSortBy,
      ledgerSortOrder,
      ledgerOptions,
      config,
      useSearchLedgers,
    })
  const { currencyOptions, isCurrencyOptionsUnavailable, summaryItems } =
    useSettlementSummaryItems<TDetail, TLocalLedger>({
      detail,
      currencies,
      isCurrencyLoading,
      config,
    })
  const { ledgerDisplayMap, filteredRecords, filteredHistoryGroups } =
    useSettlementAllocationHistory<
      TDetail,
      TRecord,
      TAllocation,
      TLocalLedger,
      TRemoteLedger
    >({
      detail,
      records,
      allocationHistory,
      ledgerOptions,
      remoteLedgerOptions,
      historySearchTerm,
      showOnlyMissingEvidenceRecords,
      config,
    })
  const { handleOpenChange, handleSubmit } = useSettlementSubmit({
    ledgerId,
    totalAllocatedAmount,
    allocations,
    paymentMethod,
    recordDate,
    receivedAt,
    receiptAccount,
    referenceNo,
    resetForm,
    onOpenChange,
    onSubmit,
  })
  const normalizedLedgerStatus = detail?.status?.trim().toUpperCase() ?? ''
  const isLedgerSettlementBlocked =
    normalizedLedgerStatus === 'CANCELLED' ||
    normalizedLedgerStatus === 'CANCELED' ||
    normalizedLedgerStatus === 'VOIDED' ||
    normalizedLedgerStatus === 'SETTLED' ||
    (detail?.outstandingAmount ?? 0) <= 0

  return {
    paymentMethod,
    setPaymentMethod,
    recordDate,
    setRecordDate,
    receivedAt,
    setReceivedAt,
    receiptAccount,
    setReceiptAccount,
    referenceNo,
    setReferenceNo,
    allocations,
    ledgerSearchTerm,
    setLedgerSearchTerm,
    ledgerStatusFilter,
    setLedgerStatusFilter,
    ledgerCurrencyFilter,
    setLedgerCurrencyFilter,
    ledgerOutstandingMin,
    setLedgerOutstandingMin,
    ledgerOutstandingMax,
    setLedgerOutstandingMax,
    ledgerSortBy,
    setLedgerSortBy,
    ledgerSortOrder,
    setLedgerSortOrder,
    isLedgerSearchDialogOpen,
    setIsLedgerSearchDialogOpen,
    historySearchTerm,
    setHistorySearchTerm,
    selectedRecordId,
    setSelectedRecordId,
    showOnlyMissingEvidenceRecords,
    setShowOnlyMissingEvidenceRecords,
    totalAllocatedAmount,
    canSubmit: canSubmit && !isLedgerSettlementBlocked,
    activeAllocationLedgerId: activeAllocation?.ledgerId ?? '',
    currencyOptions,
    currencyCode: detail?.currency ?? '',
    paymentMethodOptions: paymentMethods,
    isCurrencyOptionsUnavailable,
    summaryItems,
    ledgerDisplayMap,
    filteredRecords,
    filteredHistoryGroups,
    displayLedgerOptions,
    remoteLedgerOptions,
    isSearchingLedgers,
    handleOpenChange,
    handleSubmit,
    addAllocationRow,
    removeAllocationRow,
    updateAllocationRow,
    openLedgerSearchDialog,
    handleLedgerSelected,
    actionRecordLabel: `${config.actionLabel}记录`,
    fieldPrefix: config.fieldPrefix,
  }
}
