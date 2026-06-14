import { useState } from 'react'
import { CalendarDays, FileStack, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { SalesReturnActualAmountRecordDetailDialog } from '@/features/trading/sales-returns/components/sales-return-actual-amount-records/sales-return-actual-amount-record-detail-dialog'
import { formatSettlementMoney } from '@/features/trading/settlement-ledger-detail-dialog/utils/format-settlement-money'
import type {
  ReceivableDetailApiDTO,
  SalesReturnActualAmountRecordApiDTO,
} from '../contracts/receivable-api-dto'

type SalesReceivableSalesReturnAdjustmentSectionProps = {
  detail: ReceivableDetailApiDTO
}

export function SalesReceivableSalesReturnAdjustmentSection({
  detail,
}: SalesReceivableSalesReturnAdjustmentSectionProps) {
  const { t } = useLanguage()
  const [selectedRecord, setSelectedRecord] =
    useState<SalesReturnActualAmountRecordApiDTO | null>(null)
  const records = detail.salesReturnActualAmountRecords ?? []

  return (
    <section className='rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4'>
      <div className='flex items-start justify-between gap-3 border-b border-dashed border-primary/15 pb-3'>
        <div>
          <p className='text-sm font-black italic'>
            {t('trading.receivables.returnAdjustments.title')}
          </p>
          <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
            {t('trading.receivables.returnAdjustments.description')}
          </p>
        </div>
        <div className='text-right'>
          <p className='font-mono text-[8px] text-muted-foreground'>
            {records.length}
          </p>
          <p className='mt-1 text-sm font-black text-primary'>
            {formatSettlementMoney(
              detail.returnAdjustmentAmount,
              detail.currency
            )}
          </p>
        </div>
      </div>

      <div className='mt-4 space-y-3'>
        {records.length === 0 ? (
          <div className='rounded-[20px] border border-dashed border-border/60 bg-background/60 px-4 py-6 text-center text-xs font-black text-muted-foreground'>
            {t('trading.receivables.returnAdjustments.empty')}
          </div>
        ) : (
          records.map((record) => (
            <button
              key={record.id}
              type='button'
              onClick={() => setSelectedRecord(record)}
              className='block w-full rounded-[20px] border border-dashed border-border/70 bg-background/70 p-4 text-left transition-colors hover:bg-background'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-black text-foreground'>
                    {record.returnNo}
                  </p>
                  <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {record.salesOrderNo}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-black text-primary'>
                    {formatSettlementMoney(record.amount, detail.currency)}
                  </p>
                  <p className='mt-1 font-mono text-[8px] text-muted-foreground'>
                    {record.recordedAt.replace('T', ' ').slice(0, 16)}
                  </p>
                </div>
              </div>

              <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <CalendarDays className='size-3.5' />
                    {t(
                      'trading.salesReturns.queryShell.actualAmountRecordedAt'
                    )}
                  </div>
                  <p className='text-xs font-black text-foreground'>
                    {record.recordedAt.replace('T', ' ').slice(0, 16)}
                  </p>
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <User className='size-3.5' />
                    {t(
                      'trading.salesReturns.queryShell.actualAmountRecordedBy'
                    )}
                  </div>
                  <p className='text-xs font-black text-foreground'>
                    {record.recordedBy}
                  </p>
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <FileStack className='size-3.5' />
                    {t('trading.receivables.returnAdjustments.note')}
                  </div>
                  <p className='line-clamp-2 text-xs leading-5 font-bold text-foreground'>
                    {record.note?.trim() || '--'}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <SalesReturnActualAmountRecordDetailDialog
        record={selectedRecord}
        currencyCode={detail.currency}
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null)
          }
        }}
      />
    </section>
  )
}
