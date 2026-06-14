import { useLanguage } from '@/context/language-provider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrderEvidenceGallery } from '@/features/trading/components/parts/order-evidence-gallery'
import type { SalesReturnActualAmountRecord } from '@/features/trading/sales/services/sales-return-service'
import { formatSettlementMoney } from '@/features/trading/settlement-ledger-detail-dialog/utils/format-settlement-money'

type SalesReturnActualAmountRecordDetailDialogProps = {
  record?: SalesReturnActualAmountRecord | null
  currencyCode?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SalesReturnActualAmountRecordDetailDialog({
  record,
  currencyCode,
  open,
  onOpenChange,
}: SalesReturnActualAmountRecordDetailDialogProps) {
  const { t } = useLanguage()

  if (!record) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className='w-[calc(100vw-24px)] max-w-[880px] rounded-[32px] border-none bg-background p-0 shadow-2xl'
      >
        <DialogHeader className='border-b border-dashed border-border/70 px-6 py-5 text-left'>
          <DialogTitle className='text-lg font-black tracking-tighter uppercase italic'>
            {t('trading.salesReturns.actualAmountRecordDetailDialog.title')}
          </DialogTitle>
          <DialogDescription className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t(
              'trading.salesReturns.actualAmountRecordDetailDialog.description',
              {
                returnNo: record.returnNo,
              }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4 px-6 py-5'>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t(
                  'trading.salesReturns.actualAmountRecordDetailDialog.returnNo'
                )}
              </p>
              <p className='mt-2 text-sm font-black'>{record.returnNo}</p>
            </div>
            <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t(
                  'trading.salesReturns.actualAmountRecordDetailDialog.salesOrderNo'
                )}
              </p>
              <p className='mt-2 text-sm font-black'>{record.salesOrderNo}</p>
            </div>
            <div className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 px-4 py-3'>
              <p className='text-[10px] font-black tracking-widest text-primary/70 uppercase'>
                {t('trading.salesReturns.queryShell.actualAmount')}
              </p>
              <p className='mt-2 text-sm font-black text-primary'>
                {formatSettlementMoney(record.amount, currencyCode)}
              </p>
            </div>
            <div className='rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 px-4 py-3'>
              <p className='text-[10px] font-black tracking-widest text-amber-600/70 uppercase'>
                {t(
                  'trading.salesReturns.actualAmountRecordDetailDialog.estimatedAmountSnapshot'
                )}
              </p>
              <p className='mt-2 text-sm font-black text-amber-700'>
                {formatSettlementMoney(
                  record.estimatedReturnAmountSnapshot,
                  currencyCode
                )}
              </p>
            </div>
          </div>

          <div className='grid gap-3 md:grid-cols-2'>
            <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('trading.salesReturns.queryShell.actualAmountRecordedAt')}
              </p>
              <p className='mt-2 text-sm font-black'>
                {record.recordedAt.replace('T', ' ').slice(0, 16)}
              </p>
            </div>
            <div className='rounded-[24px] border border-dashed border-border/60 bg-muted/10 px-4 py-3'>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('trading.salesReturns.queryShell.actualAmountRecordedBy')}
              </p>
              <p className='mt-2 text-sm font-black'>{record.recordedBy}</p>
            </div>
          </div>

          <div className='rounded-[24px] border border-dashed border-border/70 bg-muted/5 px-4 py-4'>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              {t('trading.salesReturns.actualAmountRecordDetailDialog.note')}
            </p>
            <p className='mt-3 text-sm leading-6 font-bold text-foreground'>
              {record.note?.trim() || '--'}
            </p>
            <OrderEvidenceGallery
              evidences={record.evidences ?? []}
              titleKey='trading.salesReturns.actualAmountRecordDetailDialog.evidences'
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
