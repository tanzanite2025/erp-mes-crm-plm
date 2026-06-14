import type { SettlementLedgerDetailDialogViewModel } from '../types'
import { LedgerSearchDialog } from './ledger-search-dialog'

interface SettlementLedgerSearchDialogContainerProps {
  vm: Pick<
    SettlementLedgerDetailDialogViewModel,
    | 'isLedgerSearchDialogOpen'
    | 'activeAllocationLedgerId'
    | 'setIsLedgerSearchDialogOpen'
    | 'handleLedgerSelected'
    | 'displayLedgerOptions'
    | 'remoteLedgerOptions'
    | 'isSearchingLedgers'
    | 'ledgerSearchTerm'
    | 'setLedgerSearchTerm'
    | 'ledgerStatusFilter'
    | 'setLedgerStatusFilter'
    | 'ledgerCurrencyFilter'
    | 'setLedgerCurrencyFilter'
    | 'ledgerOutstandingMin'
    | 'setLedgerOutstandingMin'
    | 'ledgerOutstandingMax'
    | 'setLedgerOutstandingMax'
    | 'ledgerSortBy'
    | 'setLedgerSortBy'
    | 'ledgerSortOrder'
    | 'setLedgerSortOrder'
  >
  ledgerKindLabel: string
  partnerLabel: string
  amountLabel: string
}

export function SettlementLedgerSearchDialogContainer({
  vm,
  ledgerKindLabel,
  partnerLabel,
  amountLabel,
}: SettlementLedgerSearchDialogContainerProps) {
  return (
    <LedgerSearchDialog
      open={vm.isLedgerSearchDialogOpen}
      title={`选择${ledgerKindLabel}台账`}
      description={`在弹窗内搜索、筛选并确认一条${ledgerKindLabel}台账候选。`}
      partnerLabel={partnerLabel}
      outstandingLabel={`${amountLabel}金额`}
      selectedLedgerId={vm.activeAllocationLedgerId}
      onOpenChange={vm.setIsLedgerSearchDialogOpen}
      onConfirm={vm.handleLedgerSelected}
      searchResults={vm.displayLedgerOptions.map((option) => {
        const matched = vm.remoteLedgerOptions.find(
          (item) => item.id === option.id
        )
        return {
          id: option.id,
          documentNo: option.documentNo,
          partnerName: matched?.partnerName ?? '',
          outstandingAmount: matched?.outstandingAmount ?? 0,
          status: matched?.status ?? '',
          currency: matched?.currency ?? '',
        }
      })}
      isSearching={vm.isSearchingLedgers}
      searchTerm={vm.ledgerSearchTerm}
      onSearchTermChange={vm.setLedgerSearchTerm}
      statusFilter={vm.ledgerStatusFilter}
      onStatusFilterChange={vm.setLedgerStatusFilter}
      currencyFilter={vm.ledgerCurrencyFilter}
      onCurrencyFilterChange={vm.setLedgerCurrencyFilter}
      outstandingMin={vm.ledgerOutstandingMin}
      onOutstandingMinChange={vm.setLedgerOutstandingMin}
      outstandingMax={vm.ledgerOutstandingMax}
      onOutstandingMaxChange={vm.setLedgerOutstandingMax}
      sortBy={vm.ledgerSortBy}
      onSortByChange={vm.setLedgerSortBy}
      sortOrder={vm.ledgerSortOrder}
      onSortOrderChange={vm.setLedgerSortOrder}
    />
  )
}
