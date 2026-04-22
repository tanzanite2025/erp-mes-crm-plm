import { useMemo } from 'react'

import {
  buildDisplayLedgerOptions,
  filterLocalLedgers,
} from '../utils/settlement-record-dialog-selectors'
import type {
  SettlementLedgerSearchHookParams,
  SettlementLedgerSearchHookResult,
  SettlementLocalLedgerLike,
  SettlementRemoteLedgerLike,
} from '../types'

interface SettlementLedgerSearchConfig<TLocalLedger extends SettlementLocalLedgerLike> {
  amountLabel: string
  getLocalLedgerPartnerName: (ledger: TLocalLedger) => string
}

interface UseSettlementLedgerSearchParams<
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
> {
  ledgerSearchTerm: string
  debouncedLedgerSearchTerm: string
  ledgerStatusFilter: string
  ledgerCurrencyFilter: string
  ledgerOutstandingMin: string
  ledgerOutstandingMax: string
  ledgerSortBy: string
  ledgerSortOrder: string
  ledgerOptions: TLocalLedger[]
  config: SettlementLedgerSearchConfig<TLocalLedger>
  useSearchLedgers: (
    params: SettlementLedgerSearchHookParams
  ) => SettlementLedgerSearchHookResult<TRemoteLedger>
}

export function useSettlementLedgerSearch<
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
>({
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
}: UseSettlementLedgerSearchParams<TLocalLedger, TRemoteLedger>) {
  const searchLedgersQuery = useSearchLedgers({
    keyword: debouncedLedgerSearchTerm,
    status: ledgerStatusFilter,
    currency: ledgerCurrencyFilter,
    outstandingMin: ledgerOutstandingMin,
    outstandingMax: ledgerOutstandingMax,
    sortBy: ledgerSortBy,
    sortOrder: ledgerSortOrder,
  })

  const remoteLedgerOptions = useMemo(() => searchLedgersQuery.data ?? [], [searchLedgersQuery.data])
  const fallbackFilteredLedgerOptions = useMemo(
    () =>
      filterLocalLedgers({
        ledgers: ledgerOptions,
        keyword: ledgerSearchTerm,
        getSearchText: (ledger) =>
          `${ledger.documentNo} ${config.getLocalLedgerPartnerName(ledger)} ${ledger.outstandingAmount}`,
      }),
    [config, ledgerOptions, ledgerSearchTerm]
  )
  const displayLedgerOptions = useMemo(
    () =>
      buildDisplayLedgerOptions({
        debouncedKeyword: debouncedLedgerSearchTerm,
        localLedgers: fallbackFilteredLedgerOptions,
        getLocalPartnerName: config.getLocalLedgerPartnerName,
        remoteLedgers: remoteLedgerOptions,
        amountLabel: config.amountLabel,
      }),
    [config, debouncedLedgerSearchTerm, fallbackFilteredLedgerOptions, remoteLedgerOptions]
  )

  return {
    remoteLedgerOptions,
    displayLedgerOptions,
    isSearchingLedgers: searchLedgersQuery.isFetching,
  }
}
