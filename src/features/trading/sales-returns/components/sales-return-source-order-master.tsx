import { CalendarDays, FileStack, Package2, RotateCcw, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  getSalesStatusLabel,
  getSalesStatusMeta,
} from '@/features/trading/data/sales-status'
import type { SalesOrder, SalesOrderLine } from '@/features/trading/data/schema'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'

type SalesReturnSourceOrderMasterProps = {
  orders: SalesOrder[]
  returnRecords: SalesReturnRecord[]
  onStartReturnLine: (order: SalesOrder, lineId: number) => void
}

const SALES_RETURN_SOURCE_ORDER_CARD_CLASS =
  'rounded-[28px] border border-border/80 bg-background p-0 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.02] transition-colors dark:bg-card dark:shadow-[0_16px_36px_rgba(0,0,0,0.22)] dark:ring-white/[0.03]'

function canCreateReturn(order: SalesOrder) {
  if (!order.availableActions || order.availableActions.length === 0) {
    return false
  }

  return order.availableActions.some(
    (item) => item.action === 'createReturn' && item.allowed
  )
}

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

function getLineReturnRecords(
  returnRecords: SalesReturnRecord[],
  orderId: string,
  lineId: number
) {
  return returnRecords.filter(
    (record) =>
      record.salesOrderId === orderId &&
      record.lines.some((line) => line.salesOrderLineId === lineId)
  )
}

function getRequestedReturnQuantity(
  returnRecords: SalesReturnRecord[],
  lineId: number
) {
  return returnRecords.reduce(
    (sum, record) =>
      sum +
      record.lines
        .filter((line) => line.salesOrderLineId === lineId)
        .reduce((lineSum, line) => lineSum + line.quantity, 0),
    0
  )
}

function getLatestReturnRecord(returnRecords: SalesReturnRecord[]) {
  return [...returnRecords].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  )[0]
}

export function SalesReturnSourceOrderMaster({
  orders,
  returnRecords,
  onStartReturnLine,
}: SalesReturnSourceOrderMasterProps) {
  const { t } = useLanguage()

  if (orders.length === 0) {
    return (
      <div className='rounded-[28px] border border-dashed border-muted/50 bg-background/70 px-5 py-10 text-center'>
        <p className='text-sm font-black text-foreground'>
          {t('trading.salesReturns.entryShell.sourceEmptyTitle')}
        </p>
        <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
          {t('trading.salesReturns.entryShell.sourceEmptyDescription')}
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {orders.map((order) => {
        const statusMeta = getSalesStatusMeta(order.status)
        const isReturnAllowed = canCreateReturn(order)
        const orderLines = order.lines ?? []

        return (
          <Card
            key={order.id}
            className={SALES_RETURN_SOURCE_ORDER_CARD_CLASS}
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
                    {t('trading.salesReturns.entryShell.customer')}
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {order.customerName}
                  </p>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <Package2 className='size-3.5 shrink-0' />
                    {t('trading.salesReturns.entryShell.sourceQuantity')}
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {order.quantity.toLocaleString()} PCS
                  </p>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <CalendarDays className='size-3.5 shrink-0' />
                    {t('trading.salesReturns.entryShell.sourceOrderDate')}
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {order.orderDate || '--'}
                  </p>
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    <FileStack className='size-3.5 shrink-0' />
                    退货明细
                  </div>
                  <p className='mt-0.5 truncate text-xs font-black text-foreground'>
                    {orderLines.length.toLocaleString()} 行
                  </p>
                </div>
              </div>
            </div>

            <div className='border-t border-dashed border-border/60'>
              <div className='hidden grid-cols-[56px_140px_minmax(0,1.2fr)_96px_110px_110px_130px_110px] gap-3 px-4 py-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:grid'>
                <span>行号</span>
                <span>产品码</span>
                <span>产品</span>
                <span>已交付</span>
                <span>已申请退货</span>
                <span>可退数量</span>
                <span>退货状态</span>
                <span className='text-right'>操作</span>
              </div>

              <div className='divide-y divide-dashed divide-border/60'>
                {orderLines.length === 0 ? (
                  <div className='px-4 py-5 text-center text-xs font-bold text-muted-foreground'>
                    当前订单没有可展示的订单明细
                  </div>
                ) : (
                  orderLines.map((line) => {
                    const hasLineId = typeof line.id === 'number'
                    const lineId = hasLineId ? Number(line.id) : 0
                    const relatedReturns = hasLineId
                      ? getLineReturnRecords(returnRecords, order.id, lineId)
                      : []
                    const requestedQuantity = hasLineId
                      ? getRequestedReturnQuantity(relatedReturns, lineId)
                      : 0
                    const remainingQuantity = Math.max(
                      0,
                      line.remainingReturnableQuantity ?? 0
                    )
                    const latestReturnRecord =
                      getLatestReturnRecord(relatedReturns)
                    const canStartLineReturn =
                      isReturnAllowed && hasLineId && remainingQuantity > 0

                    return (
                      <div
                        key={`${order.id}-${line.lineNo}-${line.id ?? 'line'}`}
                        className='grid gap-3 px-4 py-3 xl:grid-cols-[56px_140px_minmax(0,1.2fr)_96px_110px_110px_130px_110px] xl:items-center'
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
                            产品码
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
                            已申请退货
                          </p>
                          <p className='text-xs font-black text-foreground'>
                            {requestedQuantity.toLocaleString()} {line.uom}
                          </p>
                        </div>
                        <div>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            可退数量
                          </p>
                          <p className='text-xs font-black text-emerald-600'>
                            {remainingQuantity.toLocaleString()} {line.uom}
                          </p>
                        </div>
                        <div className='min-w-0'>
                          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase xl:hidden'>
                            退货状态
                          </p>
                          {latestReturnRecord ? (
                            <div className='flex flex-wrap gap-1.5'>
                              <span className='inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-600'>
                                {getSalesReturnStatusLabel(
                                  latestReturnRecord.status,
                                  t
                                )}
                              </span>
                              <span className='inline-flex rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-black text-muted-foreground'>
                                {relatedReturns.length.toLocaleString()} 单
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
                            disabled={!canStartLineReturn}
                            className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest uppercase'
                            onClick={() => {
                              if (!canStartLineReturn) return
                              onStartReturnLine(order, lineId)
                            }}
                          >
                            <RotateCcw className='mr-1 size-3.5' />
                            发起退货
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
