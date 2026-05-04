'use client'

import { Link } from '@tanstack/react-router'
import {
  ArrowLeftRight,
  ArrowRight,
  Barcode,
  ChevronDown,
  PackageCheck,
  RefreshCw,
  ScanLine,
  Truck,
  Warehouse,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { SalesExchangeDraftRecord } from '@/features/trading/sales-exchanges/types/sales-exchange-types'
import { useSalesExchangeReceivingQueue } from '../hooks/use-sales-exchange-receiving-queue'

const salesExchangeReceivingMaxVisibleItems = 3
const salesExchangeReceivingMaxVisibleLines = 2

function formatSalesExchangeReceivingDate(value: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function getSalesExchangeReceivingStatusLabel(status: string) {
  if (status === 'Draft') {
    return '待旧货入库'
  }
  if (status === 'OldItemReceived') {
    return '旧货已收'
  }
  if (status === 'ReplacementPrepared') {
    return '补发待出库'
  }
  if (status === 'ReplacementShipped') {
    return '补发已发出'
  }
  if (status === 'Closed') {
    return '已关闭'
  }
  if (status === 'Canceled') {
    return '已取消'
  }
  return status
}

function countSalesExchangeDraftRecordLabelCodes(
  salesExchangeDraftRecord: SalesExchangeDraftRecord
) {
  return salesExchangeDraftRecord.lines.reduce(
    (sum, lineDraft) => sum + lineDraft.recognizedLabelCodes.length,
    0
  )
}

function SalesExchangeReceivingQueueItemCard({
  salesExchangeDraftRecord,
  isConfirmingOldItemInbound,
  onConfirmOldItemInbound,
}: {
  salesExchangeDraftRecord: SalesExchangeDraftRecord
  isConfirmingOldItemInbound: boolean
  onConfirmOldItemInbound: (
    salesExchangeDraftRecord: SalesExchangeDraftRecord
  ) => Promise<void> | void
}) {
  const visibleLineDrafts = salesExchangeDraftRecord.lines.slice(
    0,
    salesExchangeReceivingMaxVisibleLines
  )
  const hiddenLineDraftCount = Math.max(
    salesExchangeDraftRecord.lines.length - visibleLineDrafts.length,
    0
  )
  const recognizedLabelCodeCount = countSalesExchangeDraftRecordLabelCodes(
    salesExchangeDraftRecord
  )

  return (
    <div className='rounded-2xl border border-dashed border-sky-500/20 bg-background/80 p-4 shadow-sm transition-colors hover:border-sky-500/40 hover:bg-sky-500/3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='truncate font-mono text-[11px] font-black uppercase tracking-widest text-sky-700'>
              {salesExchangeDraftRecord.exchangeNo}
            </span>
            <Badge className='h-5 rounded-full border-none bg-sky-500/10 px-2 text-[8px] font-black text-sky-700'>
              {getSalesExchangeReceivingStatusLabel(
                salesExchangeDraftRecord.status
              )}
            </Badge>
          </div>
          <div className='mt-2 grid gap-1.5 text-[10px] font-bold text-muted-foreground/65'>
            <div className='flex items-center gap-1.5'>
              <ArrowLeftRight className='size-3 text-sky-700' />
              <span className='shrink-0'>来源订单</span>
              <span className='truncate font-mono font-black text-slate-800'>
                {salesExchangeDraftRecord.sourceSalesOrderNo}
              </span>
            </div>
            <div className='truncate text-xs font-black text-slate-800'>
              {salesExchangeDraftRecord.customerName}
            </div>
          </div>
        </div>
        <div className='rounded-xl bg-sky-500/10 p-2 text-sky-700'>
          <PackageCheck className='size-4' />
        </div>
      </div>

      <div className='mt-4 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
        <div className='rounded-xl bg-muted/40 px-2 py-2'>
          <div className='text-[8px]'>数量</div>
          <div className='mt-1 font-mono text-sm text-slate-800'>
            {salesExchangeDraftRecord.totalExchangeQuantity}
          </div>
        </div>
        <div className='rounded-xl bg-muted/40 px-2 py-2'>
          <div className='text-[8px]'>标签码</div>
          <div className='mt-1 font-mono text-sm text-slate-800'>
            {recognizedLabelCodeCount}
          </div>
        </div>
        <div className='rounded-xl bg-muted/40 px-2 py-2'>
          <div className='text-[8px]'>日期</div>
          <div className='mt-1 font-mono text-sm text-slate-800'>
            {formatSalesExchangeReceivingDate(
              salesExchangeDraftRecord.exchangeDate
            )}
          </div>
        </div>
      </div>

      <div className='mt-4 rounded-2xl border border-dashed border-sky-500/20 bg-sky-500/4 px-3 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <div className='text-[8px] font-black uppercase tracking-widest text-sky-700/70'>
              旧货物流
            </div>
            <div className='mt-1 flex items-center gap-2 text-[11px] font-black text-slate-900'>
              <Truck className='size-3.5 shrink-0 text-sky-700' />
              <span className='truncate'>
                {salesExchangeDraftRecord.receivedOldItemTrackingNo ||
                  '待补录旧货物流'}
              </span>
            </div>
          </div>
          <div className='min-w-0 text-right'>
            <div className='text-[8px] font-black uppercase tracking-widest text-sky-700/70'>
              预计补发
            </div>
            <div className='mt-1 truncate font-mono text-[11px] font-black text-slate-900'>
              {salesExchangeDraftRecord.expectedReplacementDate || '待确认'}
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4 space-y-2'>
        {visibleLineDrafts.map((lineDraft) => (
          <div
            key={lineDraft.lineDraftId}
            className='flex items-center justify-between gap-3 rounded-xl bg-muted/25 px-3 py-2'
          >
            <div className='min-w-0'>
              <p className='truncate text-[11px] font-black text-slate-800'>
                {lineDraft.productModel || lineDraft.productCode}
              </p>
              <p className='truncate font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40'>
                {lineDraft.productCode}
              </p>
            </div>
            <span className='shrink-0 font-mono text-[11px] font-black text-sky-700'>
              {lineDraft.exchangeQuantity} {lineDraft.uom}
            </span>
          </div>
        ))}
        {hiddenLineDraftCount > 0 ? (
          <div className='rounded-xl bg-muted/20 px-3 py-2 text-[10px] font-black text-muted-foreground/50'>
            另有 {hiddenLineDraftCount} 条换货明细
          </div>
        ) : null}
      </div>

      <div className='mt-4 flex items-center justify-between gap-3 border-t border-dashed border-muted/50 pt-3'>
        <div className='min-w-0 truncate text-[9px] font-black uppercase tracking-widest text-muted-foreground/45'>
          旧货先入售后暂存，补发另走出库链路
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          <Button
            type='button'
            size='sm'
            className='h-8 rounded-full px-3 text-[9px] font-black uppercase tracking-widest'
            disabled={
              isConfirmingOldItemInbound ||
              salesExchangeDraftRecord.status !== 'Draft'
            }
            onClick={() => void onConfirmOldItemInbound(salesExchangeDraftRecord)}
          >
            确认旧货入库
          </Button>
          <Button
            asChild
            size='sm'
            variant='ghost'
            className='h-8 rounded-full px-3 text-[9px] font-black uppercase tracking-widest text-sky-700 hover:bg-sky-500/10'
          >
            <Link to='/trading/sales-exchanges'>
              查看换货 <ArrowRight className='size-3' />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SalesExchangeReceivingQueueCard() {
  const {
    readResource,
    isRefreshing,
    isConfirmingOldItemInbound,
    reloadSalesExchangeReceivingQueue,
    confirmSalesExchangeOldItemInbound,
  } = useSalesExchangeReceivingQueue()
  const items = readResource.status === 'ready' ? readResource.items : []
  const hasItems = items.length > 0
  const totalPendingQuantity =
    readResource.status === 'ready' ? readResource.totalPendingQuantity : 0
  const totalRecognizedLabelCodeCount =
    readResource.status === 'ready'
      ? readResource.totalRecognizedLabelCodeCount
      : 0
  const visibleItems = items.slice(0, salesExchangeReceivingMaxVisibleItems)
  const hiddenItemCount = Math.max(items.length - visibleItems.length, 0)

  return (
    <Collapsible key={hasItems ? 'has-items' : 'empty'} defaultOpen={hasItems} className='rounded-2xl border border-dashed border-sky-500/25 bg-sky-500/3 p-3 shadow-inner md:rounded-[28px] md:p-4'>
      <CollapsibleTrigger asChild className='group w-full text-left hover:no-underline'>
        <div
          role='button'
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) {
              return
            }

            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.currentTarget.click()
            }
          }}
        >
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <div className='rounded-xl bg-sky-500/10 p-2.5 text-sky-700'>
              <ArrowLeftRight className='size-4.5' />
            </div>
            <div className='min-w-0 self-center'>
              <div className='flex flex-wrap items-center gap-1.5'>
                <h2 className='text-[13px] font-black tracking-tighter text-slate-900 md:text-sm'>
                  销售换货待入库
                </h2>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-6 rounded-full px-2 text-[8px] font-black uppercase tracking-widest text-sky-700 hover:bg-sky-500/10'
                  disabled={isRefreshing}
                  onClick={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    void reloadSalesExchangeReceivingQueue()
                  }}
                >
                  <RefreshCw
                    className={`mr-1 size-2.5 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  刷新
                </Button>
              </div>
              <p className='mt-0.5 text-[10px] font-bold leading-4 text-muted-foreground/60 group-data-[state=closed]:hidden'>
                客户换货退回的旧货先进入售后暂存，标签码用于核对原出货对象；补发新货后续独立走出库链路。
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2.5'>
            <div className='flex flex-wrap items-center justify-end gap-1.5 lg:max-w-[360px]'>
              <div className='inline-flex h-8 min-w-[82px] items-center justify-between gap-2 rounded-full border border-dashed border-sky-500/15 bg-background/85 px-2.5'>
                <span className='text-[7px] font-black uppercase tracking-widest text-muted-foreground/45'>
                  待处理
                </span>
                <span className='font-mono text-[11px] font-black text-slate-900'>
                  {items.length}
                </span>
              </div>
              <div className='inline-flex h-8 min-w-[94px] items-center justify-between gap-2 rounded-full border border-dashed border-sky-500/15 bg-background/85 px-2.5'>
                <span className='text-[7px] font-black uppercase tracking-widest text-muted-foreground/45'>
                  待收数量
                </span>
                <span className='font-mono text-[11px] font-black text-sky-700'>
                  {totalPendingQuantity}
                </span>
              </div>
              <div className='inline-flex h-8 min-w-[86px] items-center justify-between gap-2 rounded-full border border-dashed border-sky-500/15 bg-background/85 px-2.5'>
                <span className='text-[7px] font-black uppercase tracking-widest text-muted-foreground/45'>
                  标签码
                </span>
                <div className='flex min-w-0 items-center justify-end gap-1 text-[8px] font-black text-sky-700'>
                  <Barcode className='size-3 shrink-0' />
                  <span className='truncate'>
                    {totalRecognizedLabelCodeCount}
                  </span>
                </div>
              </div>
            </div>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-dashed border-sky-500/30 bg-background/70 text-sky-700'>
              <ChevronDown className='size-3.5 transition-transform group-data-[state=open]:rotate-180' />
            </div>
          </div>
        </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <div className='mt-4'>
          {visibleItems.length > 0 ? (
            <>
              <div className='grid gap-3 lg:grid-cols-3'>
                {visibleItems.map((salesExchangeDraftRecord) => (
                  <SalesExchangeReceivingQueueItemCard
                    key={salesExchangeDraftRecord.id}
                    salesExchangeDraftRecord={salesExchangeDraftRecord}
                    isConfirmingOldItemInbound={isConfirmingOldItemInbound}
                    onConfirmOldItemInbound={confirmSalesExchangeOldItemInbound}
                  />
                ))}
              </div>
              {hiddenItemCount > 0 ? (
                <div className='mt-3 rounded-2xl bg-background/70 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                  还有 {hiddenItemCount} 张销售换货草稿，请进入销售换货继续处理
                </div>
              ) : null}
            </>
          ) : (
            <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted/60 bg-background/60 px-4 py-8 text-center'>
              <ScanLine className='size-8 text-sky-600/30' />
              <p className='mt-3 text-sm font-black text-slate-800'>
                暂无销售换货待入库
              </p>
              <p className='mt-1 text-[11px] font-bold text-muted-foreground/50'>
                销售换货草稿创建后，会在这里形成旧货待入库核对入口。
              </p>
            </div>
          )}
        </div>

        {items.length > 0 ? (
          <div className='mt-4 rounded-2xl bg-background/65 px-4 py-3 text-[10px] font-bold text-muted-foreground/60'>
            建议先暂存到{' '}
            {readResource.status === 'ready'
              ? readResource.defaultTargetCategoryName
              : '售后换货暂存仓'}
            ，
            质检后再决定可售、维修、报废或继续补发。
            <Warehouse className='ml-1 inline size-3.5 text-sky-700' />
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  )
}
