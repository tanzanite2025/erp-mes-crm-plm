import {
  ArrowLeftRight,
  Barcode,
  CalendarDays,
  Package2,
  Truck,
  User,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getSalesStatusLabel,
  getSalesStatusMeta,
} from '@/features/trading/data/sales-status'
import type { SalesOrderLine } from '@/features/trading/data/schema'
import type {
  SalesExchangeDraftRecord,
  SalesExchangeSourceOrderCandidate,
} from '../types/sales-exchange-types'

type SalesExchangeSourceOrderMasterProps = {
  sourceOrderCandidates: SalesExchangeSourceOrderCandidate[]
  salesExchangeDraftRecords: SalesExchangeDraftRecord[]
  onOpenCreateSalesExchangeDialog: (
    sourceOrderCandidate: SalesExchangeSourceOrderCandidate,
    lineId: number
  ) => void
}

const SALES_EXCHANGE_SOURCE_ORDER_CARD_CLASS =
  'rounded-[28px] border border-border/80 bg-background p-0 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02] transition-colors dark:bg-card dark:shadow-[0_16px_36px_rgba(0,0,0,0.22)] dark:ring-white/[0.03]'

function getSalesExchangeStatusLabel(status: string) {
  switch (status) {
    case 'Draft':
      return '已创建'
    case 'OldItemReceived':
      return '旧货已收'
    case 'ReplacementPrepared':
      return '待补发'
    case 'ReplacementShipped':
      return '补发中'
    case 'Closed':
      return '已关闭'
    case 'Canceled':
      return '已取消'
    default:
      return status
  }
}

function getLineTitle(line: SalesOrderLine) {
  return (
    line.productDisplayFullLabelSnapshot ||
    line.productDisplayTitleSnapshot ||
    line.productModel ||
    line.description ||
    '--'
  )
}

function getLineSubtitle(line: SalesOrderLine) {
  return [
    line.productDisplaySubtitleSnapshot,
    line.specification,
    line.customerPartNo,
  ]
    .filter(Boolean)
    .join(' / ')
}

function getLineExchangeRecords(
  salesExchangeDraftRecords: SalesExchangeDraftRecord[],
  orderId: string,
  lineId: number
) {
  return salesExchangeDraftRecords.filter(
    (record) =>
      record.sourceSalesOrderId === orderId &&
      record.lines.some((line) => line.salesOrderLineId === lineId)
  )
}

function getLineExchangeQuantity(
  salesExchangeDraftRecords: SalesExchangeDraftRecord[],
  lineId: number
) {
  return salesExchangeDraftRecords.reduce(
    (sum, record) =>
      sum +
      record.lines
        .filter((line) => line.salesOrderLineId === lineId)
        .reduce((lineSum, line) => lineSum + line.exchangeQuantity, 0),
    0
  )
}

function getLatestExchangeRecord(records: SalesExchangeDraftRecord[]) {
  return [...records].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )[0]
}

function formatUniqueValues(values: string[]) {
  const uniqueValues = Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean))
  )

  if (uniqueValues.length === 0) {
    return '--'
  }

  if (uniqueValues.length === 1) {
    return uniqueValues[0]
  }

  return `${uniqueValues[0]} +${uniqueValues.length - 1}`
}

export function SalesExchangeSourceOrderMaster({
  sourceOrderCandidates,
  salesExchangeDraftRecords,
  onOpenCreateSalesExchangeDialog,
}: SalesExchangeSourceOrderMasterProps) {
  const { t } = useLanguage()

  if (sourceOrderCandidates.length === 0) {
    return (
      <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/70 px-5 py-10 text-center'>
        <p className='text-sm font-black text-foreground'>暂无匹配的销售订单</p>
        <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
          可按客户、订单号或订单名称搜索；换货只在当前页面展示行级旧货和补发信息。
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {sourceOrderCandidates.map((sourceOrderCandidate) => {
        const { order, exchangeableLines, canCreateSalesExchangeDraft } =
          sourceOrderCandidate
        const statusMeta = getSalesStatusMeta(order.status)

        return (
          <Card
            key={order.id}
            className={SALES_EXCHANGE_SOURCE_ORDER_CARD_CLASS}
          >
            <div className='flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between'>
              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <p className='truncate text-sm font-black tracking-tight text-foreground'>
                    {order.orderNo}
                  </p>
                  <span
                    className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusMeta.color}`}
                  >
                    {getSalesStatusLabel(order.status, t)}
                  </span>
                </div>
                <p className='mt-1 truncate text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  {order.orderName || '--'}
                </p>
              </div>

              <div className='grid min-w-0 flex-[1.2] grid-cols-2 gap-x-5 gap-y-2 md:grid-cols-4 xl:max-w-3xl'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <User className='size-3.5 shrink-0' />
                    客户
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {order.customerName}
                  </p>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <Package2 className='size-3.5 shrink-0' />
                    可换明细
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {exchangeableLines.length.toLocaleString()} 行
                  </p>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <Package2 className='size-3.5 shrink-0' />
                    已交付数量
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {order.lines
                      .reduce(
                        (sum, salesOrderLine) =>
                          sum + (salesOrderLine.deliveredQty || 0),
                        0
                      )
                      .toLocaleString()}{' '}
                    PCS
                  </p>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <CalendarDays className='size-3.5 shrink-0' />
                    交付日期
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {order.deliveryDate || order.orderDate || '--'}
                  </p>
                </div>
              </div>
            </div>

            <div className='border-t border-dashed border-border/60'>
              <div className='hidden min-w-[1180px] grid-cols-[56px_130px_minmax(0,1.1fr)_90px_90px_90px_130px_130px_130px_120px_110px] gap-3 px-4 py-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:grid'>
                <span>行号</span>
                <span>原产品码</span>
                <span>产品</span>
                <span>已交付</span>
                <span>已换货</span>
                <span>可换数量</span>
                <span>补发产品码</span>
                <span>旧货运单</span>
                <span>补发运单</span>
                <span>换货状态</span>
                <span className='text-right'>操作</span>
              </div>

              <div className='divide-y divide-dashed divide-border/60'>
                {exchangeableLines.length === 0 ? (
                  <div className='px-4 py-5 text-center text-xs font-bold text-muted-foreground'>
                    当前订单还没有已交付的可换货明细
                  </div>
                ) : (
                  exchangeableLines.map((line) => {
                    const hasLineId = typeof line.id === 'number'
                    const lineId = hasLineId ? Number(line.id) : 0
                    const relatedExchanges = hasLineId
                      ? getLineExchangeRecords(
                          salesExchangeDraftRecords,
                          order.id,
                          lineId
                        )
                      : []
                    const exchangeQuantity = hasLineId
                      ? getLineExchangeQuantity(relatedExchanges, lineId)
                      : 0
                    const availableExchangeQuantity = Math.max(
                      0,
                      (line.deliveredQty || 0) - exchangeQuantity
                    )
                    const latestExchangeRecord =
                      getLatestExchangeRecord(relatedExchanges)
                    const replacementProductCode = formatUniqueValues(
                      relatedExchanges.flatMap((record) =>
                        record.lines
                          .filter(
                            (exchangeLine) =>
                              exchangeLine.salesOrderLineId === lineId
                          )
                          .map(
                            (exchangeLine) =>
                              exchangeLine.replacementProductCode
                          )
                      )
                    )
                    const oldItemTrackingNo = formatUniqueValues(
                      relatedExchanges.map(
                        (record) => record.receivedOldItemTrackingNo
                      )
                    )
                    const replacementTrackingNo = formatUniqueValues(
                      relatedExchanges.map(
                        (record) => record.replacementTrackingNo
                      )
                    )
                    const canStartLineExchange =
                      canCreateSalesExchangeDraft &&
                      hasLineId &&
                      availableExchangeQuantity > 0

                    return (
                      <div
                        key={`${order.id}-${line.lineNo}-${line.id ?? 'line'}`}
                        className='grid gap-3 px-4 py-3 xl:min-w-[1180px] xl:grid-cols-[56px_130px_minmax(0,1.1fr)_90px_90px_90px_130px_130px_130px_120px_110px] xl:items-center'
                      >
                        <div>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            行号
                          </p>
                          <p className='text-xs font-black text-foreground'>
                            {line.lineNo}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            原产品码
                          </p>
                          <p className='truncate text-xs font-black text-foreground'>
                            {line.productCode || '--'}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            产品
                          </p>
                          <p className='truncate text-xs font-black text-foreground'>
                            {getLineTitle(line)}
                          </p>
                          {getLineSubtitle(line) ? (
                            <p className='mt-0.5 truncate text-[11px] font-bold text-muted-foreground'>
                              {getLineSubtitle(line)}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            已交付
                          </p>
                          <p className='text-xs font-black text-foreground'>
                            {line.deliveredQty.toLocaleString()} {line.uom}
                          </p>
                        </div>
                        <div>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            已换货
                          </p>
                          <p className='text-xs font-black text-foreground'>
                            {exchangeQuantity.toLocaleString()} {line.uom}
                          </p>
                        </div>
                        <div>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            可换数量
                          </p>
                          <p className='text-xs font-black text-emerald-600'>
                            {availableExchangeQuantity.toLocaleString()}{' '}
                            {line.uom}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            补发产品码
                          </p>
                          <p className='truncate text-xs font-black text-foreground'>
                            {replacementProductCode}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            旧货运单
                          </p>
                          <p className='truncate text-xs font-black text-foreground'>
                            <Truck className='mr-1 inline size-3.5 text-muted-foreground' />
                            {oldItemTrackingNo}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            补发运单
                          </p>
                          <p className='truncate text-xs font-black text-foreground'>
                            <Barcode className='mr-1 inline size-3.5 text-muted-foreground' />
                            {replacementTrackingNo}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            换货状态
                          </p>
                          {latestExchangeRecord ? (
                            <div className='flex flex-wrap gap-1.5'>
                              <span className='inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-700'>
                                {getSalesExchangeStatusLabel(
                                  latestExchangeRecord.status
                                )}
                              </span>
                              <span className='inline-flex rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-black text-muted-foreground'>
                                {relatedExchanges.length.toLocaleString()} 单
                              </span>
                            </div>
                          ) : (
                            <span className='text-xs font-bold text-muted-foreground'>
                              无
                            </span>
                          )}
                        </div>
                        <div className='flex justify-start xl:justify-end'>
                          <Button
                            type='button'
                            size='sm'
                            disabled={!canStartLineExchange}
                            className='h-8 shrink-0 rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
                            onClick={() => {
                              if (!canStartLineExchange) return
                              onOpenCreateSalesExchangeDialog(
                                sourceOrderCandidate,
                                lineId
                              )
                            }}
                          >
                            <ArrowLeftRight className='mr-1 size-3.5' />
                            发起换货
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
