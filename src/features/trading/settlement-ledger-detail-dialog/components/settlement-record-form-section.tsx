import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { SettlementAllocationMode } from '../types'
import type { SettlementAllocationDraft } from '../services/settlement-record-payload'
import { formatSettlementMoney } from '../utils/format-settlement-money'

interface SettlementRecordFormSectionProps {
  title: string
  allocationMode: SettlementAllocationMode
  showDetailedFields?: boolean
  paymentMethodFieldId: string
  paymentMethodLabel: string
  paymentMethod: string
  onPaymentMethodChange: (value: string) => void
  paymentMethodOptions: Array<{ code: string; name: string }>
  paymentMethodPlaceholder: string
  dateFieldId: string
  dateLabel: string
  recordDate: string
  onRecordDateChange: (value: string) => void
  receiptAccountFieldId: string
  receiptAccountLabel: string
  receiptAccount: string
  onReceiptAccountChange: (value: string) => void
  referenceFieldId: string
  referenceLabel: string
  referenceNo: string
  onReferenceNoChange: (value: string) => void
  totalAllocatedLabel: string
  totalAllocatedAmount: number
  currencyCode: string
  addAllocationLabel: string
  onAddAllocationRow: () => void
  searchFieldId: string
  searchLabel: string
  searchPlaceholder: string
  ledgerSearchTerm: string
  onLedgerSearchTermChange: (value: string) => void
  statusFieldId: string
  statusLabel: string
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  statusOptions: ReadonlyArray<{ label: string; value: string }>
  currencyFieldId: string
  currencyLabel: string
  currencyFilter: string
  onCurrencyFilterChange: (value: string) => void
  currencyOptions: Array<{ code: string }>
  currencyAllLabel: string
  currencyLoadingLabel: string
  currencyUnavailableLabel: string
  isCurrencyLoading: boolean
  isCurrencyOptionsUnavailable: boolean
  outstandingMinFieldId: string
  outstandingMinLabel: string
  outstandingMin: string
  onOutstandingMinChange: (value: string) => void
  outstandingMaxFieldId: string
  outstandingMaxLabel: string
  outstandingMax: string
  onOutstandingMaxChange: (value: string) => void
  sortByFieldId: string
  sortByLabel: string
  sortBy: string
  onSortByChange: (value: string) => void
  sortByPlaceholder: string
  sortByOptions: ReadonlyArray<{ label: string; value: string }>
  sortOrderFieldId: string
  sortOrderLabel: string
  sortOrder: string
  onSortOrderChange: (value: string) => void
  sortOrderPlaceholder: string
  sortOrderOptions: ReadonlyArray<{ label: string; value: string }>
  statusAllLabel: string
  statusPlaceholder: string
  allocations: SettlementAllocationDraft[]
  allocationFieldPrefix: string
  ledgerIdLabel: string
  selectedLedgerPlaceholder: string
  ledgerDisplayMap: Map<string, string>
  selectLedgerLabel: string
  onOpenLedgerSearchDialog: (sequenceNo: number) => void
  allocatedAmountLabel: string
  onUpdateAllocationRow: (sequenceNo: number, patch: Partial<SettlementAllocationDraft>) => void
  remarkLabel: string
  removeAllocationLabel: string
  onRemoveAllocationRow: (sequenceNo: number) => void
}

export function SettlementRecordFormSection({
  title,
  allocationMode,
  showDetailedFields = false,
  paymentMethodFieldId,
  paymentMethodLabel,
  paymentMethod,
  onPaymentMethodChange,
  paymentMethodOptions,
  paymentMethodPlaceholder,
  dateFieldId,
  dateLabel,
  recordDate,
  onRecordDateChange,
  receiptAccountFieldId,
  receiptAccountLabel,
  receiptAccount,
  onReceiptAccountChange,
  referenceFieldId,
  referenceLabel,
  referenceNo,
  onReferenceNoChange,
  totalAllocatedLabel,
  totalAllocatedAmount,
  currencyCode,
  addAllocationLabel,
  onAddAllocationRow,
  searchFieldId,
  searchLabel,
  searchPlaceholder,
  ledgerSearchTerm,
  onLedgerSearchTermChange,
  statusFieldId,
  statusLabel,
  statusFilter,
  onStatusFilterChange,
  statusOptions,
  currencyFieldId,
  currencyLabel,
  currencyFilter,
  onCurrencyFilterChange,
  currencyOptions,
  currencyAllLabel,
  currencyLoadingLabel,
  currencyUnavailableLabel,
  isCurrencyLoading,
  isCurrencyOptionsUnavailable,
  outstandingMinFieldId,
  outstandingMinLabel,
  outstandingMin,
  onOutstandingMinChange,
  outstandingMaxFieldId,
  outstandingMaxLabel,
  outstandingMax,
  onOutstandingMaxChange,
  sortByFieldId,
  sortByLabel,
  sortBy,
  onSortByChange,
  sortByPlaceholder,
  sortByOptions,
  sortOrderFieldId,
  sortOrderLabel,
  sortOrder,
  onSortOrderChange,
  sortOrderPlaceholder,
  sortOrderOptions,
  statusAllLabel,
  statusPlaceholder,
  allocations,
  allocationFieldPrefix,
  ledgerIdLabel,
  selectedLedgerPlaceholder,
  ledgerDisplayMap,
  selectLedgerLabel,
  onOpenLedgerSearchDialog,
  allocatedAmountLabel,
  onUpdateAllocationRow,
  remarkLabel,
  removeAllocationLabel,
  onRemoveAllocationRow,
}: SettlementRecordFormSectionProps) {
  const isSingleLedgerMode = allocationMode === 'single-ledger'
  const allocationGridClass = isSingleLedgerMode
    ? 'md:grid-cols-[minmax(140px,0.65fr)_minmax(220px,1fr)]'
    : 'xl:grid-cols-[minmax(0,1.6fr)_minmax(120px,0.55fr)_minmax(140px,0.75fr)_auto]'

  return (
    <div className='grid gap-3 rounded-[22px] border border-dashed border-muted/60 bg-muted/5 p-4 shadow-inner [&_input]:h-9 [&_input]:rounded-xl [&_input]:text-xs [&_label]:text-[9px] [&_label]:font-black [&_label]:uppercase [&_label]:tracking-[0.12em] [&_label]:text-muted-foreground/60 [&_[data-slot=select-trigger]]:h-9 [&_[data-slot=select-trigger]]:rounded-xl [&_[data-slot=select-trigger]]:text-xs'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-sm font-black leading-tight tracking-tight'>{title}</div>
        <div className='flex flex-wrap items-center gap-2'>
          <div className='rounded-full border border-dashed border-muted/60 bg-background px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/60'>
            {totalAllocatedLabel}
            <span className='ml-2 text-foreground tabular-nums'>{formatSettlementMoney(totalAllocatedAmount, currencyCode)}</span>
          </div>
          {!isSingleLedgerMode ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 rounded-full border-dashed px-3 text-[10px] font-black tracking-[0.12em]'
              onClick={onAddAllocationRow}
            >
              {addAllocationLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
        {showDetailedFields ? (
          <div className='grid gap-1.5'>
            <Label htmlFor={paymentMethodFieldId}>{paymentMethodLabel}</Label>
            <Select value={paymentMethod || '__empty__'} onValueChange={(value) => onPaymentMethodChange(value === '__empty__' ? '' : value)}>
              <SelectTrigger id={paymentMethodFieldId}>
                <SelectValue placeholder={paymentMethodPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='__empty__'>{paymentMethodPlaceholder}</SelectItem>
                {paymentMethodOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className='grid gap-1.5'>
          <Label htmlFor={dateFieldId}>{dateLabel}</Label>
          <Input
            id={dateFieldId}
            type='date'
            value={recordDate}
            onChange={(event) => onRecordDateChange(event.target.value)}
          />
        </div>
        {showDetailedFields ? (
          <div className='grid gap-1.5'>
            <Label htmlFor={receiptAccountFieldId}>{receiptAccountLabel}</Label>
            <Input
              id={receiptAccountFieldId}
              value={receiptAccount}
              onChange={(event) => onReceiptAccountChange(event.target.value)}
            />
          </div>
        ) : null}
        <div className='grid gap-1.5'>
          <Label htmlFor={referenceFieldId}>{referenceLabel}</Label>
          <Input
            id={referenceFieldId}
            value={referenceNo}
            onChange={(event) => onReferenceNoChange(event.target.value)}
          />
        </div>
      </div>

      {!isSingleLedgerMode ? (
        <div className='grid gap-2'>
          <div className='grid gap-1.5'>
            <Label htmlFor={searchFieldId}>{searchLabel}</Label>
            <Input
              id={searchFieldId}
              value={ledgerSearchTerm}
              onChange={(event) => onLedgerSearchTermChange(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>

          <details className='group rounded-2xl border border-dashed border-muted/50 bg-background/55 px-3 py-2'>
            <summary className='cursor-pointer select-none text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/60 marker:text-muted-foreground/50'>
              台账筛选 / 排序
            </summary>
            <div className='mt-3 grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
              <div className='grid gap-1.5'>
                <Label htmlFor={statusFieldId}>{statusLabel}</Label>
                <Select
                  value={statusFilter || '__all__'}
                  onValueChange={(value) => onStatusFilterChange(value === '__all__' ? '' : value)}
                >
                  <SelectTrigger id={statusFieldId}>
                    <SelectValue placeholder={statusPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>{statusAllLabel}</SelectItem>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor={currencyFieldId}>{currencyLabel}</Label>
                <Select
                  value={currencyFilter || '__all__'}
                  onValueChange={(value) => onCurrencyFilterChange(value === '__all__' ? '' : value)}
                  disabled={isCurrencyLoading || isCurrencyOptionsUnavailable}
                >
                  <SelectTrigger id={currencyFieldId}>
                    <SelectValue placeholder={currencyAllLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>{currencyAllLabel}</SelectItem>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isCurrencyLoading ? <div className='text-[10px] font-bold text-muted-foreground/60'>{currencyLoadingLabel}</div> : null}
                {isCurrencyOptionsUnavailable ? <div className='text-[10px] font-bold text-destructive'>{currencyUnavailableLabel}</div> : null}
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor={outstandingMinFieldId}>{outstandingMinLabel}</Label>
                <Input
                  id={outstandingMinFieldId}
                  type='number'
                  value={outstandingMin}
                  onChange={(event) => onOutstandingMinChange(event.target.value)}
                />
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor={outstandingMaxFieldId}>{outstandingMaxLabel}</Label>
                <Input
                  id={outstandingMaxFieldId}
                  type='number'
                  value={outstandingMax}
                  onChange={(event) => onOutstandingMaxChange(event.target.value)}
                />
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor={sortByFieldId}>{sortByLabel}</Label>
                <Select value={sortBy} onValueChange={onSortByChange}>
                  <SelectTrigger id={sortByFieldId}>
                    <SelectValue placeholder={sortByPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortByOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='grid gap-1.5'>
                <Label htmlFor={sortOrderFieldId}>{sortOrderLabel}</Label>
                <Select value={sortOrder} onValueChange={onSortOrderChange}>
                  <SelectTrigger id={sortOrderFieldId}>
                    <SelectValue placeholder={sortOrderPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOrderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </details>
        </div>
      ) : null}

      <div className='grid gap-2'>
        {allocations.map((item) => (
          <div
            key={item.sequenceNo}
            className={`grid gap-2 rounded-2xl border border-dashed border-muted/50 bg-background/70 p-3 ${allocationGridClass}`}
          >
            {!isSingleLedgerMode ? (
              <div className='grid gap-1.5'>
                <Label htmlFor={`${allocationFieldPrefix}-ledger-${item.sequenceNo}`}>{ledgerIdLabel}</Label>
                <div className='flex gap-2'>
                  <div
                    id={`${allocationFieldPrefix}-ledger-${item.sequenceNo}`}
                    className='flex h-9 min-w-0 flex-1 items-center truncate rounded-xl border border-dashed border-muted/60 bg-muted/10 px-3 text-xs font-semibold text-muted-foreground'
                    title={ledgerDisplayMap.get(item.ledgerId) ?? item.ledgerId ?? selectedLedgerPlaceholder}
                  >
                    <span className='truncate'>{ledgerDisplayMap.get(item.ledgerId) ?? item.ledgerId ?? selectedLedgerPlaceholder}</span>
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-9 shrink-0 rounded-full border-dashed px-3 text-[10px] font-black tracking-[0.12em]'
                    onClick={() => onOpenLedgerSearchDialog(item.sequenceNo)}
                  >
                    {selectLedgerLabel}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className='grid gap-1.5'>
              <Label htmlFor={`${allocationFieldPrefix}-amount-${item.sequenceNo}`}>{allocatedAmountLabel}</Label>
              <Input
                id={`${allocationFieldPrefix}-amount-${item.sequenceNo}`}
                type='number'
                value={item.allocatedAmount}
                onChange={(event) =>
                  onUpdateAllocationRow(item.sequenceNo, { allocatedAmount: event.target.value })
                }
              />
            </div>
            <div className='grid gap-1.5'>
              <Label htmlFor={`${allocationFieldPrefix}-remark-${item.sequenceNo}`}>{remarkLabel}</Label>
              <Input
                id={`${allocationFieldPrefix}-remark-${item.sequenceNo}`}
                value={item.remark}
                onChange={(event) => onUpdateAllocationRow(item.sequenceNo, { remark: event.target.value })}
              />
            </div>
            {!isSingleLedgerMode ? (
              <div className='flex items-end'>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 rounded-full px-3 text-[10px] font-black tracking-[0.12em] text-destructive hover:bg-destructive/10 hover:text-destructive'
                  onClick={() => onRemoveAllocationRow(item.sequenceNo)}
                  disabled={allocations.length === 1}
                >
                  {removeAllocationLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
