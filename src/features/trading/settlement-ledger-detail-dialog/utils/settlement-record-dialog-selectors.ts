import { formatSettlementMoney } from './format-settlement-money'

type LedgerLike = {
  id: string
  documentNo: string
  currency?: string
  outstandingAmount: number
}

type RecordLike = {
  id: string
  recordNo: string
  recordDate: string
  amount: number
  evidences: Array<unknown>
}

type AllocationLike = {
  id: string
  ledgerId: string
  sequenceNo: number
  allocatedAmount: number
  remark: string
  paymentRecordId?: string
  receiptRecordId?: string
}

type DisplayLedgerOptionLike = {
  id: string
  documentNo: string
  displayName: string
}

interface BuildLedgerDisplayMapParams<
  TDetail extends LedgerLike,
  TLocalLedger extends LedgerLike,
  TRemoteLedger extends LedgerLike & { partnerName: string },
> {
  detail: TDetail | null | undefined
  detailPartnerName: string | null | undefined
  localLedgers: TLocalLedger[]
  getLocalPartnerName: (ledger: TLocalLedger) => string
  remoteLedgers: TRemoteLedger[]
  amountLabel: string
}

function buildLedgerDisplayName(
  documentNo: string,
  partnerName: string,
  amountLabel: string,
  amount: number,
  currency?: string
) {
  return `${documentNo} / ${partnerName} / ${amountLabel} ${formatSettlementMoney(amount, currency)}`
}

export function buildLedgerDisplayMap<
  TDetail extends LedgerLike,
  TLocalLedger extends LedgerLike,
  TRemoteLedger extends LedgerLike & { partnerName: string },
>({
  detail,
  detailPartnerName,
  localLedgers,
  getLocalPartnerName,
  remoteLedgers,
  amountLabel,
}: BuildLedgerDisplayMapParams<TDetail, TLocalLedger, TRemoteLedger>): Map<
  string,
  string
> {
  const entries: Array<[string, string]> = localLedgers.map((ledger) => [
    ledger.id,
    buildLedgerDisplayName(
      ledger.documentNo,
      getLocalPartnerName(ledger),
      amountLabel,
      ledger.outstandingAmount,
      ledger.currency
    ),
  ])

  remoteLedgers.forEach((ledger) => {
    entries.push([
      ledger.id,
      buildLedgerDisplayName(
        ledger.documentNo,
        ledger.partnerName,
        amountLabel,
        ledger.outstandingAmount,
        ledger.currency
      ),
    ])
  })

  if (detail) {
    entries.push([
      detail.id,
      buildLedgerDisplayName(
        detail.documentNo,
        detailPartnerName ?? '-',
        amountLabel,
        detail.outstandingAmount,
        detail.currency
      ),
    ])
  }

  return new Map(entries)
}

interface FilterLocalLedgersParams<TLedger extends LedgerLike> {
  ledgers: TLedger[]
  keyword: string
  getSearchText: (ledger: TLedger) => string
}

export function filterLocalLedgers<TLedger extends LedgerLike>({
  ledgers,
  keyword,
  getSearchText,
}: FilterLocalLedgersParams<TLedger>): TLedger[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return ledgers
  }

  return ledgers.filter((ledger) =>
    getSearchText(ledger).toLowerCase().includes(normalizedKeyword)
  )
}

interface BuildDisplayLedgerOptionsParams<
  TLocalLedger extends LedgerLike,
  TRemoteLedger extends LedgerLike & { partnerName: string },
> {
  debouncedKeyword: string
  localLedgers: TLocalLedger[]
  getLocalPartnerName: (ledger: TLocalLedger) => string
  remoteLedgers: TRemoteLedger[]
  amountLabel: string
}

export function buildDisplayLedgerOptions<
  TLocalLedger extends LedgerLike,
  TRemoteLedger extends LedgerLike & { partnerName: string },
>({
  debouncedKeyword,
  localLedgers,
  getLocalPartnerName,
  remoteLedgers,
  amountLabel,
}: BuildDisplayLedgerOptionsParams<
  TLocalLedger,
  TRemoteLedger
>): DisplayLedgerOptionLike[] {
  if (debouncedKeyword.trim().length >= 2) {
    return remoteLedgers.map((ledger) => ({
      id: ledger.id,
      documentNo: ledger.documentNo,
      displayName: buildLedgerDisplayName(
        ledger.documentNo,
        ledger.partnerName,
        amountLabel,
        ledger.outstandingAmount,
        ledger.currency
      ),
    }))
  }

  return localLedgers.map((ledger) => ({
    id: ledger.id,
    documentNo: ledger.documentNo,
    displayName: buildLedgerDisplayName(
      ledger.documentNo,
      getLocalPartnerName(ledger),
      amountLabel,
      ledger.outstandingAmount,
      ledger.currency
    ),
  }))
}

interface BuildAllocationHistoryGroupsParams<
  TRecord extends RecordLike,
  TAllocation extends AllocationLike,
> {
  records: TRecord[]
  allocations: TAllocation[]
  relationKey: 'paymentRecordId' | 'receiptRecordId'
}

export function buildAllocationHistoryGroups<
  TRecord extends RecordLike,
  TAllocation extends AllocationLike,
>({
  records,
  allocations,
  relationKey,
}: BuildAllocationHistoryGroupsParams<TRecord, TAllocation>) {
  return records.map((record) => ({
    record,
    allocations: allocations.filter(
      (allocation) => allocation[relationKey] === record.id
    ),
  }))
}

export function filterRecordsByEvidence<TRecord extends RecordLike>(
  records: TRecord[],
  showOnlyMissingEvidenceRecords: boolean
): TRecord[] {
  if (!showOnlyMissingEvidenceRecords) {
    return records
  }

  return records.filter((record) => record.evidences.length === 0)
}

interface FilterAllocationHistoryGroupsParams<
  TRecord extends RecordLike,
  TAllocation extends AllocationLike,
> {
  groups: Array<{ record: TRecord; allocations: TAllocation[] }>
  historySearchTerm: string
  ledgerDisplayMap: Map<string, string>
}

export function filterAllocationHistoryGroups<
  TRecord extends RecordLike,
  TAllocation extends AllocationLike,
>({
  groups,
  historySearchTerm,
  ledgerDisplayMap,
}: FilterAllocationHistoryGroupsParams<TRecord, TAllocation>) {
  const keyword = historySearchTerm.trim().toLowerCase()
  if (!keyword) {
    return groups
  }

  return groups
    .map(({ record, allocations }) => ({
      record,
      allocations: allocations.filter((allocation) => {
        const targetLedgerDisplay =
          ledgerDisplayMap.get(allocation.ledgerId) ?? allocation.ledgerId
        const haystack =
          `${record.recordNo} ${record.recordDate} ${allocation.remark} ${targetLedgerDisplay} ${allocation.allocatedAmount}`.toLowerCase()
        return haystack.includes(keyword)
      }),
    }))
    .filter(({ record, allocations }) => {
      if (allocations.length > 0) {
        return true
      }

      return `${record.recordNo} ${record.recordDate} ${record.amount}`
        .toLowerCase()
        .includes(keyword)
    })
}
