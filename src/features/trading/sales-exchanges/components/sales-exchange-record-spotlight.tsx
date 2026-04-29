import { ArrowLeftRight, Barcode, CalendarDays, Package2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SalesExchangeDraftRecord } from '../types/sales-exchange-types'

type SalesExchangeRecordSpotlightProps = {
  salesExchangeDraftRecord?: SalesExchangeDraftRecord
}

export function SalesExchangeRecordSpotlight({
  salesExchangeDraftRecord,
}: SalesExchangeRecordSpotlightProps) {
  if (!salesExchangeDraftRecord) {
    return (
      <Card className='rounded-2xl border border-dashed border-border/70 bg-background/60 shadow-none'>
        <CardContent className='px-5 py-8 text-center'>
          <p className='text-sm font-black text-foreground'>尚未选择换货草稿</p>
          <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
            选择左侧草稿后，这里会集中展示标签码、换货明细和补发信息。
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='rounded-2xl border border-dashed border-primary/20 bg-primary/5 shadow-none'>
      <CardHeader className='px-5 py-4'>
        <CardTitle className='text-sm font-black tracking-tight text-foreground'>
          换货草稿详情
        </CardTitle>
        <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
          {salesExchangeDraftRecord.exchangeNo}
        </p>
      </CardHeader>
      <CardContent className='space-y-4 px-5 pb-5'>
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <ArrowLeftRight className='size-3.5' />
              来源订单
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.sourceSalesOrderNo}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <CalendarDays className='size-3.5' />
              预计补发
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.expectedReplacementDate || '--'}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Package2 className='size-3.5' />
              旧货物流
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.receivedOldItemTrackingNo || '--'}
            </p>
          </div>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
              <Package2 className='size-3.5' />
              补发物流
            </div>
            <p className='text-xs font-black text-foreground'>
              {salesExchangeDraftRecord.replacementTrackingNo || '--'}
            </p>
          </div>
        </div>

        <div className='rounded-[20px] border border-dashed border-border/70 bg-background/70 p-4'>
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            换货原因
          </p>
          <p className='mt-2 text-xs leading-6 font-bold text-foreground'>
            {salesExchangeDraftRecord.exchangeReason || '--'}
          </p>
        </div>

        <div className='space-y-3'>
          {salesExchangeDraftRecord.lines.map((lineDraft) => (
            <div
              key={lineDraft.lineDraftId}
              className='rounded-[20px] border border-dashed border-border/70 bg-background/80 p-4'
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-black text-foreground'>
                    {lineDraft.productCode || lineDraft.productModel}
                  </p>
                  <p className='mt-1 truncate text-xs font-bold text-muted-foreground'>
                    {lineDraft.specification || lineDraft.description || '--'}
                  </p>
                </div>
                <span className='rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600 uppercase'>
                  {lineDraft.exchangeQuantity.toLocaleString()} {lineDraft.uom}
                </span>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {lineDraft.recognizedLabelCodes.length === 0 ? (
                  <span className='inline-flex items-center rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-black text-muted-foreground'>
                    暂无标签码
                  </span>
                ) : (
                  lineDraft.recognizedLabelCodes.map((labelCode) => (
                    <span
                      key={labelCode.normalizedLabelCode}
                      className='inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-700'
                    >
                      <Barcode className='mr-1 size-3' />
                      {labelCode.normalizedLabelCode}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {salesExchangeDraftRecord.unmatchedLabelCodes.length > 0 ? (
          <div className='rounded-[20px] border border-dashed border-amber-500/30 bg-amber-500/8 p-4'>
            <p className='text-xs font-black text-amber-700'>
              未自动匹配标签码
            </p>
            <div className='mt-3 flex flex-wrap gap-2'>
              {salesExchangeDraftRecord.unmatchedLabelCodes.map((labelCode) => (
                <span
                  key={labelCode.normalizedLabelCode}
                  className='rounded-full border border-amber-500/20 bg-background/80 px-2.5 py-1 text-[10px] font-black text-amber-700'
                >
                  {labelCode.normalizedLabelCode}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

