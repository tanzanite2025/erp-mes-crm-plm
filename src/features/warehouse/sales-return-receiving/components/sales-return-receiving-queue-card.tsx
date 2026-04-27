'use client'

import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  FileText,
  ImageIcon,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  ScanLine,
  Truck,
  Warehouse,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { OrderEvidence } from '@/features/trading/data/schema'
import { ForbiddenState } from '@/components/forbidden-state'
import { isForbiddenError } from '@/lib/error-status'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { SALES_RETURN_VIRTUAL_WAREHOUSE_CODE } from '@/features/warehouse/utils/warehouse-category-config'
import {
  type SalesReturnReceivingQueueItem,
  useSalesReturnReceivingQueue,
} from '../hooks/use-sales-return-receiving-queue'

const MAX_VISIBLE_ITEMS = 3
const MAX_VISIBLE_LINES = 2
const MAX_VISIBLE_EVIDENCES = 4

function formatReturnDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  })
}

function getStatusLabel(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'created') return '已建单'
  if (normalized === 'intransit' || normalized === 'in_transit') return '退货在途'
  if (normalized === 'received') return '待入库确认'
  return status
}

function collectEvidencePreview(item: SalesReturnReceivingQueueItem) {
  const evidenceById = new Map<string, OrderEvidence>()

  for (const evidence of item.evidences) {
    if (evidence.url) evidenceById.set(evidence.id, evidence)
  }
  for (const line of item.lines) {
    for (const evidence of line.evidences ?? []) {
      if (evidence.url) evidenceById.set(evidence.id, evidence)
    }
  }

  return Array.from(evidenceById.values())
}

function QueueSkeleton() {
  return (
    <div className='grid gap-3 lg:grid-cols-3'>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className='rounded-2xl border border-dashed border-muted/60 bg-background/70 p-4'
        >
          <Skeleton className='h-4 w-28' />
          <Skeleton className='mt-4 h-3 w-full' />
          <Skeleton className='mt-2 h-3 w-4/5' />
          <Skeleton className='mt-5 h-8 w-full rounded-full' />
        </div>
      ))}
    </div>
  )
}

function QueueItemCard({ item }: { item: SalesReturnReceivingQueueItem }) {
  const visibleLines = item.lines.slice(0, MAX_VISIBLE_LINES)
  const hiddenLineCount = Math.max(item.lines.length - visibleLines.length, 0)
  const evidences = collectEvidencePreview(item)
  const visibleEvidences = evidences.slice(0, MAX_VISIBLE_EVIDENCES)
  const hiddenEvidenceCount = Math.max(
    evidences.length - visibleEvidences.length,
    0
  )

  return (
    <div className='rounded-2xl border border-dashed border-emerald-500/20 bg-background/80 p-4 shadow-sm transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/[0.03]'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-center gap-2'>
            <span className='truncate font-mono text-[11px] font-black uppercase tracking-widest text-emerald-700'>
              {item.returnNo}
            </span>
            <Badge className='h-5 rounded-full border-none bg-emerald-500/10 px-2 text-[8px] font-black text-emerald-700'>
              {getStatusLabel(item.status)}
            </Badge>
          </div>
          <div className='mt-2 grid gap-1.5 text-[10px] font-bold text-muted-foreground/65'>
            <div className='flex items-center gap-1.5'>
              <FileText className='size-3 text-emerald-700' />
              <span className='shrink-0'>销售订单</span>
              <span className='truncate font-mono font-black text-slate-800'>
                {item.salesOrderNo}
              </span>
            </div>
            <div className='truncate text-xs font-black text-slate-800'>
              {item.customerName}
            </div>
          </div>
        </div>
        <div className='rounded-xl bg-emerald-500/10 p-2 text-emerald-700'>
          <RotateCcw className='size-4' />
        </div>
      </div>

      <div className='mt-4 grid grid-cols-3 gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
        <div className='rounded-xl bg-muted/40 px-2 py-2'>
          <div className='text-[8px]'>数量</div>
          <div className='mt-1 font-mono text-sm text-slate-800'>
            {item.totalQuantity}
          </div>
        </div>
        <div className='rounded-xl bg-muted/40 px-2 py-2'>
          <div className='text-[8px]'>明细</div>
          <div className='mt-1 font-mono text-sm text-slate-800'>
            {item.lineCount}
          </div>
        </div>
        <div className='rounded-xl bg-muted/40 px-2 py-2'>
          <div className='text-[8px]'>日期</div>
          <div className='mt-1 font-mono text-sm text-slate-800'>
            {formatReturnDate(item.returnDate)}
          </div>
        </div>
      </div>

      <div className='mt-4 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-3'>
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0'>
            <div className='text-[8px] font-black uppercase tracking-widest text-emerald-700/70'>
              快递信息
            </div>
            <div className='mt-1 flex items-center gap-2 text-[11px] font-black text-slate-900'>
              <Truck className='size-3.5 shrink-0 text-emerald-700' />
              <span className='truncate'>
                {item.carrier?.trim() || '未填写承运商'}
              </span>
            </div>
          </div>
          <div className='min-w-0 text-right'>
            <div className='text-[8px] font-black uppercase tracking-widest text-emerald-700/70'>
              快递单号
            </div>
            <div className='mt-1 truncate font-mono text-[11px] font-black text-slate-900'>
              {item.trackingNo?.trim() || '未填写'}
            </div>
          </div>
        </div>
        {item.logisticsNote?.trim() ? (
          <p className='mt-2 line-clamp-2 text-[10px] font-bold leading-4 text-muted-foreground/65'>
            {item.logisticsNote}
          </p>
        ) : null}
      </div>

      <div className='mt-4'>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <div className='flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
            <ImageIcon className='size-3.5 text-emerald-700' />
            退货凭据
          </div>
          <span className='font-mono text-[9px] font-black text-muted-foreground/40'>
            {evidences.length}
          </span>
        </div>
        {visibleEvidences.length > 0 ? (
          <div className='grid grid-cols-4 gap-2'>
            {visibleEvidences.map((evidence, index) => (
              <a
                key={evidence.id}
                href={getStaticEvidenceUrl(evidence.url)}
                target='_blank'
                rel='noreferrer'
                className='group relative aspect-square overflow-hidden rounded-xl border border-muted/60 bg-muted/30'
              >
                <img
                  src={getStaticEvidenceUrl(evidence.url)}
                  alt={evidence.name || `退货凭据 ${index + 1}`}
                  className='size-full object-cover transition-transform group-hover:scale-105'
                />
                {index === visibleEvidences.length - 1 &&
                hiddenEvidenceCount > 0 ? (
                  <div className='absolute inset-0 flex items-center justify-center bg-slate-950/55 text-[10px] font-black text-white'>
                    +{hiddenEvidenceCount}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        ) : (
          <div className='rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 px-3 py-3 text-[10px] font-black text-amber-700'>
            未上传退货凭据，拆包前需要先与销售确认。
          </div>
        )}
      </div>

      <div className='mt-4 space-y-2'>
        {visibleLines.map((line) => (
          <div
            key={line.id}
            className='flex items-center justify-between gap-3 rounded-xl bg-muted/25 px-3 py-2'
          >
            <div className='min-w-0'>
              <p className='truncate text-[11px] font-black text-slate-800'>
                {line.productModel || line.productCode}
              </p>
              <p className='truncate font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40'>
                {line.productCode}
              </p>
            </div>
            <span className='shrink-0 font-mono text-[11px] font-black text-emerald-700'>
              {line.quantity} {line.uom}
            </span>
          </div>
        ))}
        {hiddenLineCount > 0 && (
          <div className='rounded-xl bg-muted/20 px-3 py-2 text-[10px] font-black text-muted-foreground/50'>
            另有 {hiddenLineCount} 条明细
          </div>
        )}
      </div>

      <div className='mt-4 flex items-center justify-between gap-3 border-t border-dashed border-muted/50 pt-3'>
        <div className='min-w-0 truncate text-[9px] font-black uppercase tracking-widest text-muted-foreground/45'>
          拆包前核对快递单号与凭据图片
        </div>
        <Button
          asChild
          size='sm'
          variant='ghost'
          className='h-8 shrink-0 rounded-full px-3 text-[9px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-500/10'
        >
          <Link
            to='/trading/sales-returns'
            search={{ returnId: item.id }}
          >
            查看单据 <ArrowRight className='size-3' />
          </Link>
        </Button>
      </div>
    </div>
  )
}

export function SalesReturnReceivingQueueCard() {
  const { readResource, isRefreshing, retry } = useSalesReturnReceivingQueue()
  const items = readResource.status === 'ready' ? readResource.items : []
  const totalPendingQuantity =
    readResource.status === 'ready' ? readResource.totalPendingQuantity : 0
  const salesReturnVirtualWarehouseName =
    readResource.status === 'ready'
      ? readResource.salesReturnVirtualWarehouseName
      : null
  const visibleItems = items.slice(0, MAX_VISIBLE_ITEMS)
  const hiddenItemCount = Math.max(items.length - visibleItems.length, 0)

  return (
    <section className='rounded-2xl md:rounded-[32px] border border-dashed border-emerald-500/25 bg-emerald-500/[0.03] p-4 md:p-5 shadow-inner'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='flex min-w-0 items-start gap-3'>
          <div className='rounded-2xl bg-emerald-500/10 p-3 text-emerald-700'>
            <PackageCheck className='size-5' />
          </div>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-base font-black tracking-tighter text-slate-900 md:text-lg'>
                销售退货待入库
              </h2>
              {isRefreshing && readResource.status === 'ready' && (
                <RefreshCw className='size-3.5 animate-spin text-emerald-600' />
              )}
            </div>
            <p className='mt-1 text-[11px] font-bold leading-5 text-muted-foreground/65'>
              客户退回货品统一先落入销售退货虚拟仓，再按质检结果分配到动态仓库。
            </p>
          </div>
        </div>

        <div className='grid grid-cols-3 gap-2 lg:w-[360px]'>
          <div className='rounded-2xl bg-background/80 px-3 py-2 text-center'>
            <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/45'>
              待处理
            </div>
            <div className='mt-1 font-mono text-lg font-black text-slate-900'>
              {items.length}
            </div>
          </div>
          <div className='rounded-2xl bg-background/80 px-3 py-2 text-center'>
            <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/45'>
              待收数量
            </div>
            <div className='mt-1 font-mono text-lg font-black text-emerald-700'>
              {totalPendingQuantity}
            </div>
          </div>
          <div className='rounded-2xl bg-background/80 px-3 py-2 text-center'>
            <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/45'>
              默认暂存仓
            </div>
            <div className='mt-1 flex min-w-0 items-center justify-center gap-1 text-[10px] font-black text-emerald-700'>
              <Warehouse className='size-3.5' />
              <span className='truncate'>
                {salesReturnVirtualWarehouseName ?? '加载中'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className='mt-4'>
        {readResource.status === 'error' ? (
          isForbiddenError(readResource.error) ? (
            <ForbiddenState />
          ) : (
            <div className='rounded-2xl border border-dashed border-red-500/20 bg-red-500/5 px-4 py-5 text-sm font-bold text-red-700'>
              <div>销售退货待入库数据加载失败，请重试后再处理。</div>
              <Button
                type='button'
                variant='outline'
                className='mt-4 h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
                onClick={() => {
                  void retry()
                }}
              >
                重试
              </Button>
            </div>
          )
        ) : readResource.status === 'loading' ? (
          <QueueSkeleton />
        ) : visibleItems.length > 0 ? (
          <>
            <div className='grid gap-3 lg:grid-cols-3'>
              {visibleItems.map((item) => (
                <QueueItemCard key={item.id} item={item} />
              ))}
            </div>
            {hiddenItemCount > 0 && (
              <div className='mt-3 rounded-2xl bg-background/70 px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                还有 {hiddenItemCount} 张销售退货单，请进入销售退货列表继续处理
              </div>
            )}
          </>
        ) : (
          <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-muted/60 bg-background/60 px-4 py-8 text-center'>
            <ScanLine className='size-8 text-emerald-600/30' />
            <p className='mt-3 text-sm font-black text-slate-800'>
              暂无销售退货待入库
            </p>
            <p className='mt-1 text-[11px] font-bold text-muted-foreground/50'>
              新退货单进入在途或待收后，会在这里形成仓库待办。
            </p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className='mt-4 rounded-2xl bg-background/65 px-4 py-3 text-[10px] font-bold text-muted-foreground/60'>
          建议先暂存到 {salesReturnVirtualWarehouseName ?? '加载中'}（{SALES_RETURN_VIRTUAL_WAREHOUSE_CODE}），质检后再分配到可售、维修或报废仓。
        </div>
      )}
    </section>
  )
}
