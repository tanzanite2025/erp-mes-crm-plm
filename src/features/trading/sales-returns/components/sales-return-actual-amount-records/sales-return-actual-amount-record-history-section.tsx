import { useMemo, useState } from 'react'
import { CalendarDays, FileStack, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { useGetSalesReturnActualAmountRecords } from '@/features/trading/sales/hooks/use-sales-returns'
import type { SalesReturnActualAmountRecord } from '@/features/trading/sales/services/sales-return-service'
import { formatSettlementMoney } from '@/features/trading/settlement-ledger-detail-dialog/utils/format-settlement-money'
import { SalesReturnActualAmountRecordDetailDialog } from './sales-return-actual-amount-record-detail-dialog'

type SalesReturnActualAmountRecordHistorySectionProps = {
  salesReturnId: string
}

export function SalesReturnActualAmountRecordHistorySection({
  salesReturnId,
}: SalesReturnActualAmountRecordHistorySectionProps) {
  const { t } = useLanguage()
  const historyQuery = useGetSalesReturnActualAmountRecords(salesReturnId)
  const [selectedRecord, setSelectedRecord] = useState<SalesReturnActualAmountRecord | null>(null)

  const records = useMemo(() => historyQuery.data ?? [], [historyQuery.data])

  return (
    <div className='rounded-[24px] border border-dashed border-border/70 bg-background/70 p-4'>
      <div className='flex items-start justify-between gap-3 border-b border-dashed border-border/60 pb-3'>
        <div>
          <p className='text-sm font-black italic'>
            {t('trading.salesReturns.actualAmountHistory.title')}
          </p>
          <p className='text-[9px] font-black uppercase tracking-widest opacity-60'>
            {t('trading.salesReturns.actualAmountHistory.description')}
          </p>
        </div>
        <span className='rounded-full border border-dashed border-primary/20 bg-primary/5 px-2.5 py-1 text-[8px] font-mono text-primary'>
          {records.length}
        </span>
      </div>

      <div className='mt-4 space-y-3'>
        {historyQuery.isLoading ? (
          <div className='rounded-[20px] border border-dashed border-border/60 bg-muted/5 px-4 py-6 text-center text-xs font-black text-muted-foreground'>
            {t('common.actions.loading')}
          </div>
        ) : records.length === 0 ? (
          <div className='rounded-[20px] border border-dashed border-border/60 bg-muted/5 px-4 py-6 text-center text-xs font-black text-muted-foreground'>
            {t('trading.salesReturns.actualAmountHistory.empty')}
          </div>
        ) : (
          records.map((record) => (
            <button
              key={record.id}
              type='button'
              onClick={() => setSelectedRecord(record)}
              className='block w-full rounded-[20px] border border-dashed border-border/70 bg-muted/5 p-4 text-left transition-colors hover:bg-primary/5'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <p className='text-sm font-black text-foreground'>{record.returnNo}</p>
                  <p className='mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    {record.salesOrderNo}
                  </p>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-black text-primary'>
                    {formatSettlementMoney(record.amount)}
                  </p>
                  <p className='mt-1 text-[8px] font-mono text-muted-foreground'>
                    {record.recordedAt.replace('T', ' ').slice(0, 16)}
                  </p>
                </div>
              </div>

              <div className='mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    <CalendarDays className='size-3.5' />
                    {t('trading.salesReturns.queryShell.actualAmountRecordedAt')}
                  </div>
                  <p className='text-xs font-black text-foreground'>
                    {record.recordedAt.replace('T', ' ').slice(0, 16)}
                  </p>
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    <User className='size-3.5' />
                    {t('trading.salesReturns.queryShell.actualAmountRecordedBy')}
                  </div>
                  <p className='text-xs font-black text-foreground'>{record.recordedBy}</p>
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                    <FileStack className='size-3.5' />
                    {t('trading.salesReturns.actualAmountHistory.note')}
                  </div>
                  <p className='line-clamp-2 text-xs leading-5 font-bold text-foreground'>
                    {record.note?.trim() || '--'}
                  </p>
                </div>
              </div>

              <div className='mt-3 flex justify-end'>
                <span className='inline-flex rounded-full border border-input bg-background px-3 py-2 text-[10px] font-black tracking-widest text-foreground uppercase'>
                  {t('trading.salesReturns.actualAmountHistory.viewDetail')}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      <SalesReturnActualAmountRecordDetailDialog
        record={selectedRecord}
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedRecord(null)
          }
        }}
      />
    </div>
  )
}
