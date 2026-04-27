import type { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  financeResourceStatus?: 'loading' | 'error' | 'ready'
  financeResourceErrorMessage?: string
  onRetryFinanceResources?: () => void
  detailResourceStatus?: 'idle' | 'loading' | 'error' | 'ready'
  detailResourceErrorMessage?: string
  onRetryDetailResource?: () => void
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
  financeResourceStatus = 'ready',
  financeResourceErrorMessage,
  onRetryFinanceResources,
  detailResourceStatus = 'ready',
  detailResourceErrorMessage,
  onRetryDetailResource,
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
  const isDetailReady = detailResourceStatus === 'ready'
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
            {detailResourceStatus === 'error' ? (
              <div className='flex min-h-[420px] items-center justify-center px-2 py-6'>
                <div className='flex max-w-md flex-col items-center gap-3 rounded-[24px] border border-dashed border-rose-300/60 bg-rose-50/60 px-6 py-8 text-center'>
                  <AlertTriangle className='size-8 text-rose-500' />
                  <div className='space-y-1'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-rose-700'>台账详情加载失败</p>
                    <p className='text-[10px] font-bold leading-5 text-rose-700/80'>
                      {detailResourceErrorMessage || '请稍后重试。'}
                    </p>
                  </div>
                  {onRetryDetailResource ? (
                    <Button
                      type='button'
                      variant='outline'
                      className='h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
                      onClick={onRetryDetailResource}
                    >
                      重试
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : detailResourceStatus === 'loading' ? (
              <div className='flex min-h-[420px] items-center justify-center px-2 py-6'>
                <div className='flex max-w-md flex-col items-center gap-3 rounded-[24px] border border-dashed border-amber-300/60 bg-amber-50/50 px-6 py-8 text-center'>
                  <Loader2 className='size-8 animate-spin text-amber-600' />
                  <div className='space-y-1'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-amber-700'>台账详情加载中</p>
                    <p className='text-[10px] font-bold leading-5 text-amber-700/80'>请稍候后再登记结算记录。</p>
                  </div>
                </div>
              </div>
            ) : detailResourceStatus === 'idle' ? (
              <div className='flex min-h-[420px] items-center justify-center px-2 py-6'>
                <div className='flex max-w-md flex-col items-center gap-3 rounded-[24px] border border-dashed border-muted/60 bg-muted/5 px-6 py-8 text-center'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>未选择台账</p>
                  <p className='text-[10px] font-bold leading-5 text-muted-foreground/80'>请先选择一条台账记录。</p>
                </div>
              </div>
            ) : (
              <>
                <SettlementLedgerDetailDialogBody
                  vm={vm}
                  config={config}
                  showDetailedFields={showDetailedFields}
                  isCurrencyLoading={isCurrencyLoading}
                  financeResourceStatus={financeResourceStatus}
                  financeResourceErrorMessage={financeResourceErrorMessage}
                  onRetryFinanceResources={onRetryFinanceResources}
                  allocationHistoryCount={allocationHistory.length}
                />

                {extraContent ? <div className='mt-3'>{extraContent}</div> : null}
              </>
            )}
          </div>

          <DialogFooter className='border-t border-dashed border-muted/60 bg-background px-5 py-3'>
            <SettlementLedgerDetailDialogFooter
              vm={vm}
              actionLabel={config.actionLabel}
              isSubmitPending={isSubmitPending}
              isDetailLoading={isDetailLoading}
              isDetailReady={isDetailReady}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isSingleLedgerMode && isDetailReady ? (
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
