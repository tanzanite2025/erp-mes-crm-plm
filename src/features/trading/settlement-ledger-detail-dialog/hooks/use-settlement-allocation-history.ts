import { useMemo } from 'react'

import {
  buildAllocationHistoryGroups,
  buildLedgerDisplayMap,
  filterAllocationHistoryGroups,
  filterRecordsByEvidence,
} from '../utils/settlement-record-dialog-selectors'
import type {
  SettlementAllocationLike,
  SettlementDetailLike,
  SettlementLedgerDetailDialogConfig,
  SettlementLocalLedgerLike,
  SettlementRecordLike,
  SettlementRemoteLedgerLike,
} from '../types'

interface UseSettlementAllocationHistoryParams<
  TDetail extends SettlementDetailLike,
  TRecord extends SettlementRecordLike,
  TAllocation extends SettlementAllocationLike,
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
> {
  detail: TDetail | null | undefined
  records: TRecord[]
  allocationHistory: TAllocation[]
  ledgerOptions: TLocalLedger[]
  remoteLedgerOptions: TRemoteLedger[]
  historySearchTerm: string
  showOnlyMissingEvidenceRecords: boolean
  config: Pick<
    SettlementLedgerDetailDialogConfig<TDetail, TLocalLedger>,
    'amountLabel' | 'relationKey' | 'getDetailPartnerName' | 'getLocalLedgerPartnerName'
  >
}

export function useSettlementAllocationHistory<
  TDetail extends SettlementDetailLike,
  TRecord extends SettlementRecordLike,
  TAllocation extends SettlementAllocationLike,
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
>({
  detail,
  records,
  allocationHistory,
  ledgerOptions,
  remoteLedgerOptions,
  historySearchTerm,
  showOnlyMissingEvidenceRecords,
  config,
}: UseSettlementAllocationHistoryParams<
  TDetail,
  TRecord,
  TAllocation,
  TLocalLedger,
  TRemoteLedger
>) {
  const ledgerDisplayMap = useMemo(
    () =>
      buildLedgerDisplayMap({
        detail,
        detailPartnerName: detail ? config.getDetailPartnerName(detail) : undefined,
        localLedgers: ledgerOptions,
        getLocalPartnerName: config.getLocalLedgerPartnerName,
        remoteLedgers: remoteLedgerOptions,
        amountLabel: config.amountLabel,
      }),
    [config, detail, ledgerOptions, remoteLedgerOptions]
  )
  const historyGroups = useMemo(
    () =>
      buildAllocationHistoryGroups({
        records,
        allocations: allocationHistory,
        relationKey: config.relationKey,
      }),
    [allocationHistory, config.relationKey, records]
  )
  const filteredRecords = useMemo(
    () => filterRecordsByEvidence(records, showOnlyMissingEvidenceRecords),
    [records, showOnlyMissingEvidenceRecords]
  )
  const filteredHistoryGroups = useMemo(
    () =>
      filterAllocationHistoryGroups({
        groups: historyGroups,
        historySearchTerm,
        ledgerDisplayMap,
      }),
    [historyGroups, historySearchTerm, ledgerDisplayMap]
  )

  return {
    ledgerDisplayMap,
    filteredRecords,
    filteredHistoryGroups,
  }
}
