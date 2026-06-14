import { ArrowLeftRight, CalendarDays, Package2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SalesExchangeDraftRecord } from '../types/sales-exchange-types'

type SalesExchangeDraftRecordMasterProps = {
  salesExchangeDraftRecords: SalesExchangeDraftRecord[]
  selectedSalesExchangeDraftRecordId?: string
  onSelectSalesExchangeDraftRecord: (salesExchangeDraftRecordId: string) => void
  onRemoveSalesExchangeDraftRecord: (
    salesExchangeDraftRecordId: string
  ) => Promise<void> | void
}

function getSalesExchangeRecordStatusLabel(status: string) {
  switch (status) {
    case 'Draft':
      return '草稿'
    case 'OldItemReceived':
      return '旧货已收'
    case 'ReplacementPrepared':
      return '补发待出库'
    case 'ReplacementShipped':
      return '补发已发出'
    case 'Closed':
      return '已关闭'
    case 'Canceled':
      return '已取消'
    default:
      return status
  }
}

export function SalesExchangeDraftRecordMaster({
  salesExchangeDraftRecords,
  selectedSalesExchangeDraftRecordId,
  onSelectSalesExchangeDraftRecord,
  onRemoveSalesExchangeDraftRecord,
}: SalesExchangeDraftRecordMasterProps) {
  if (salesExchangeDraftRecords.length === 0) {
    return (
      <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/70 px-5 py-10 text-center'>
        <p className='text-sm font-black text-foreground'>暂无换货草稿</p>
        <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
          从上方销售订单进入新建换货，录入标签码后会先沉淀为本页草稿。
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {salesExchangeDraftRecords.map((salesExchangeDraftRecord) => {
        const isSelected =
          salesExchangeDraftRecord.id === selectedSalesExchangeDraftRecordId

        return (
          <Card
            key={salesExchangeDraftRecord.id}
            role='button'
            tabIndex={0}
            onClick={() =>
              onSelectSalesExchangeDraftRecord(salesExchangeDraftRecord.id)
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectSalesExchangeDraftRecord(salesExchangeDraftRecord.id)
              }
            }}
            className={`cursor-pointer rounded-[24px] border-dashed px-4 py-4 shadow-none transition-all ${
              isSelected
                ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                : 'border-muted/50 bg-background/80 hover:bg-muted/20'
            }`}
          >
            <div className='flex items-start justify-between gap-4'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-black tracking-tight text-foreground'>
                  {salesExchangeDraftRecord.exchangeNo}
                </p>
                <p className='mt-1 truncate text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  来源订单 {salesExchangeDraftRecord.sourceSalesOrderNo}
                </p>
              </div>
              <span className='inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-600 uppercase'>
                {getSalesExchangeRecordStatusLabel(
                  salesExchangeDraftRecord.status
                )}
              </span>
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <ArrowLeftRight className='size-3.5' />
                  客户
                </div>
                <p className='truncate text-xs font-black text-foreground'>
                  {salesExchangeDraftRecord.customerName}
                </p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package2 className='size-3.5' />
                  换货数量
                </div>
                <p className='text-xs font-black text-foreground'>
                  {salesExchangeDraftRecord.totalExchangeQuantity.toLocaleString()}{' '}
                  PCS
                </p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package2 className='size-3.5' />
                  标签码
                </div>
                <p className='text-xs font-black text-foreground'>
                  {salesExchangeDraftRecord.lines
                    .reduce(
                      (sum, lineDraft) =>
                        sum + lineDraft.recognizedLabelCodes.length,
                      0
                    )
                    .toLocaleString()}{' '}
                  个
                </p>
              </div>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <CalendarDays className='size-3.5' />
                  换货日期
                </div>
                <p className='text-xs font-black text-foreground'>
                  {salesExchangeDraftRecord.exchangeDate}
                </p>
              </div>
            </div>

            <div className='mt-4 flex justify-end'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full border-rose-500/20 px-4 text-[10px] font-black tracking-widest text-rose-600 uppercase hover:text-rose-700'
                disabled={salesExchangeDraftRecord.status !== 'Draft'}
                onClick={(event) => {
                  event.stopPropagation()
                  void onRemoveSalesExchangeDraftRecord(
                    salesExchangeDraftRecord.id
                  )
                }}
              >
                <Trash2 className='mr-1 size-3.5' />
                移除草稿
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
