import { useState } from 'react'
import { CalendarDays, FileStack, Package2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useLanguage } from '@/context/language-provider'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { SalesOrderSalesReturnActualAmountEntryDialog } from './sales-order-sales-return-actual-amount-entry-dialog/sales-order-sales-return-actual-amount-entry-dialog'

function getSalesReturnStatusLabel(
  status: string,
  t: ReturnType<typeof useLanguage>['t']
) {
  switch (status) {
    case 'Created':
      return t('trading.salesReturns.statuses.Created')
    case 'InTransit':
      return t('trading.salesReturns.statuses.InTransit')
    case 'Received':
      return t('trading.salesReturns.statuses.Received')
    case 'Completed':
    case 'Closed':
      return t('trading.salesReturns.statuses.Closed')
    case 'Canceled':
      return t('trading.salesReturns.statuses.Canceled')
    default:
      return status
  }
}

type SalesReturnRecordMasterProps = {
  records: SalesReturnRecord[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function SalesReturnRecordMaster({
  records,
  selectedId,
  onSelect,
}: SalesReturnRecordMasterProps) {
  const { t } = useLanguage()
  const [entryRecord, setEntryRecord] = useState<SalesReturnRecord | null>(null)

  if (records.length === 0) {
    return (
      <div className='rounded-[28px] border border-dashed border-muted/50 bg-background/70 px-5 py-10 text-center'>
        <p className='text-sm font-black text-foreground'>暂无销售退货单</p>
        <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
          当前筛选范围内还没有真实销售退货单数据。
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {records.map((record) => {
        const isSelected = record.id === selectedId

        return (
          <Card
            key={record.id}
            role='button'
            tabIndex={0}
            onClick={() => onSelect(record.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(record.id)
              }
            }}
            className={`cursor-pointer rounded-[24px] border-dashed px-4 py-4 shadow-none transition-all ${
              isSelected
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                : 'border-muted/50 bg-background/80 hover:bg-muted/20'
            }`}
          >
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-sm font-black tracking-tight text-foreground'>
                  {record.returnNo}
                </p>
                <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  来源订单 {record.salesOrderNo}
                </p>
              </div>
              <div className='flex flex-col items-end gap-2'>
                <span className='inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600 uppercase'>
                  {getSalesReturnStatusLabel(record.status, t)}
                </span>
                {record.pendingTrackingFill ? (
                  <span className='inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600 uppercase'>
                    {t('trading.salesReturns.queryShell.pendingTrackingBadge')}
                  </span>
                ) : null}
              </div>
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <User className='size-3.5' />
                  客户
                </div>
                <p className='text-xs font-black text-foreground'>
                  {record.customerName}
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package2 className='size-3.5' />
                  退货数量
                </div>
                <p className='text-xs font-black text-foreground'>
                  {record.totalQuantity.toLocaleString()} PCS
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <CalendarDays className='size-3.5' />
                  退货日期
                </div>
                <p className='text-xs font-black text-foreground'>
                  {record.returnDate.slice(0, 10)}
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <FileStack className='size-3.5' />
                  {t('trading.salesReturns.createSheet.estimatedAmount')}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='text-xs font-black text-foreground'>
                    ¥ {record.totalAmount.toLocaleString()}
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={(event) => {
                      event.stopPropagation()
                      setEntryRecord(record)
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation()
                    }}
                    className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
                  >
                    {t('trading.salesReturns.queryShell.actualAmountEntryAction')}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )
      })}

      <SalesOrderSalesReturnActualAmountEntryDialog
        key={`${entryRecord?.id ?? 'sales-return-entry'}-${entryRecord?.updatedAt ?? 'closed'}`}
        record={entryRecord ?? undefined}
        open={Boolean(entryRecord)}
        onOpenChange={(open) => {
          if (!open) {
            setEntryRecord(null)
          }
        }}
      />
    </div>
  )
}
