import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { useSettlementLedgerDetailDialogViewModel } from '../hooks/use-settlement-ledger-detail-dialog-view-model'
import type {
  SettlementAllocationLike,
  SettlementDetailLike,
  SettlementLedgerDetailDialogConfig,
  SettlementLedgerSearchHookParams,
  SettlementLedgerSearchHookResult,
  SettlementLocalLedgerLike,
  SettlementRecordLike,
  SettlementRemoteLedgerLike,
} from '../types'
import { SettlementLedgerDetailDialogBody } from './settlement-ledger-detail-dialog-body'
import { SettlementLedgerDetailDialogFooter } from './settlement-ledger-detail-dialog-footer'
import { SettlementLedgerSearchDialogContainer } from './settlement-ledger-search-dialog-container'
import type { CreateSettlementRecordApiDTO } from '../../contracts/settlement-record-api-dto'

interface SettlementLedgerDetailDialogProps<
  TDetail extends SettlementDetailLike,
  TRecord extends SettlementRecordLike,
  TAllocation extends SettlementAllocationLike,
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
> {
  open: boolean
  ledgerId: string | null
  onOpenChange: (open: boolean) => void
  detail: TDetail | null | undefined
  records: TRecord[]
  allocationHistory: TAllocation[]
  ledgerOptions: TLocalLedger[]
  currencies: Array<{ code: string; status: string }>
  paymentMethods: Array<{ code: string; name: string }>
  isCurrencyLoading: boolean
  isDetailLoading: boolean
  isSubmitPending: boolean
  onSubmit: (payload: CreateSettlementRecordApiDTO) => Promise<void>
  extraContent?: ReactNode
  useSearchLedgers: (
    params: SettlementLedgerSearchHookParams
  ) => SettlementLedgerSearchHookResult<TRemoteLedger>
  config: SettlementLedgerDetailDialogConfig<TDetail, TLocalLedger>
}

export function SettlementLedgerDetailDialog<
  TDetail extends SettlementDetailLike,
  TRecord extends SettlementRecordLike,
  TAllocation extends SettlementAllocationLike,
  TLocalLedger extends SettlementLocalLedgerLike,
  TRemoteLedger extends SettlementRemoteLedgerLike,
>({
  open,
  ledgerId,
  onOpenChange,
  detail,
  records,
  allocationHistory,
  ledgerOptions,
  currencies,
  paymentMethods,
  isCurrencyLoading,
  isDetailLoading,
  isSubmitPending,
  onSubmit,
  extraContent,
  useSearchLedgers,
  config,
}: SettlementLedgerDetailDialogProps<
  TDetail,
  TRecord,
  TAllocation,
  TLocalLedger,
  TRemoteLedger
>) {
  const vm = useSettlementLedgerDetailDialogViewModel({
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
  })
  const showDetailedFields = config.recordType === 'receipt'
  const isSingleLedgerMode = config.allocationMode === 'single-ledger'
  const description = isSingleLedgerMode
    ? `查看单据摘要，并登记一笔${config.actionLabel}记录。`
    : `查看台账明细，并登记一笔${config.actionLabel}记录。`

  return (
    <>
      <Dialog open={open} onOpenChange={vm.handleOpenChange}>
        <DialogContent size='6xl' className='gap-0 overflow-hidden rounded-[28px] border-dashed p-0 shadow-2xl'>
          <DialogHeader className='border-b border-dashed border-muted/60 bg-muted/20 px-5 py-3.5'>
            <DialogTitle className='text-base font-black leading-tight tracking-tight'>{config.dialogTitle}</DialogTitle>
            <DialogDescription className='text-[11px] font-medium leading-5 text-muted-foreground/70'>
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className='max-h-[calc(100dvh-9.5rem)] overflow-y-auto px-5 py-4'>
            <SettlementLedgerDetailDialogBody
              vm={vm}
              config={config}
              showDetailedFields={showDetailedFields}
              isCurrencyLoading={isCurrencyLoading}
              allocationHistoryCount={allocationHistory.length}
            />

            {extraContent ? <div className='mt-3'>{extraContent}</div> : null}
          </div>

          <DialogFooter className='border-t border-dashed border-muted/60 bg-background px-5 py-3'>
            <SettlementLedgerDetailDialogFooter
              vm={vm}
              actionLabel={config.actionLabel}
              isSubmitPending={isSubmitPending}
              isDetailLoading={isDetailLoading}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isSingleLedgerMode ? (
        <SettlementLedgerSearchDialogContainer
          vm={vm}
          ledgerKindLabel={config.ledgerKindLabel}
          partnerLabel={config.partnerLabel}
          amountLabel={config.amountLabel}
        />
      ) : null}
    </>
  )
}
