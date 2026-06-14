import { ArrowLeftRight, CalendarDays, Package2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { SalesExchangeSourceOrderCandidate } from '../types/sales-exchange-types'

type SalesExchangeSourceOrderMasterProps = {
  sourceOrderCandidates: SalesExchangeSourceOrderCandidate[]
  selectedSourceSalesOrderId?: string
  onSelectSourceSalesOrder: (salesOrderId: string) => void
  onOpenCreateSalesExchangeDialog: (
    sourceOrderCandidate: SalesExchangeSourceOrderCandidate
  ) => void
}

export function SalesExchangeSourceOrderMaster({
  sourceOrderCandidates,
  selectedSourceSalesOrderId,
  onSelectSourceSalesOrder,
  onOpenCreateSalesExchangeDialog,
}: SalesExchangeSourceOrderMasterProps) {
  if (sourceOrderCandidates.length === 0) {
    return (
      <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/70 px-5 py-10 text-center'>
        <p className='text-sm font-black text-foreground'>
          暂无匹配的可换货销售订单
        </p>
        <p className='mt-2 text-xs leading-6 font-bold text-muted-foreground'>
          可按客户、订单号或订单名称搜索，换货入口只展示生产中或已完成的销售订单。
        </p>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {sourceOrderCandidates.map((sourceOrderCandidate) => {
        const { order, exchangeableLines, canCreateSalesExchangeDraft } =
          sourceOrderCandidate
        const isSelected = order.id === selectedSourceSalesOrderId

        return (
          <Card
            key={order.id}
            role='button'
            tabIndex={0}
            onClick={() => onSelectSourceSalesOrder(order.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectSourceSalesOrder(order.id)
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
                  {order.orderNo}
                </p>
                <p className='mt-1 truncate text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  {order.orderName || '--'}
                </p>
              </div>
              <span className='inline-flex rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-600 uppercase'>
                {order.status}
              </span>
            </div>

            <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <User className='size-3.5' />
                  客户
                </div>
                <p className='truncate text-xs font-black text-foreground'>
                  {order.customerName}
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package2 className='size-3.5' />
                  可换明细
                </div>
                <p className='text-xs font-black text-foreground'>
                  {exchangeableLines.length.toLocaleString()} 行
                </p>
              </div>

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package2 className='size-3.5' />
                  已交付数量
                </div>
                <p className='text-xs font-black text-foreground'>
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

              <div className='space-y-1'>
                <div className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <CalendarDays className='size-3.5' />
                  交付日期
                </div>
                <p className='text-xs font-black text-foreground'>
                  {order.deliveryDate || order.orderDate || '--'}
                </p>
              </div>
            </div>

            <div className='mt-4 flex justify-end'>
              <Button
                type='button'
                size='sm'
                disabled={!canCreateSalesExchangeDraft}
                className='rounded-full px-4 text-[10px] font-black tracking-widest uppercase'
                onClick={(event) => {
                  event.stopPropagation()
                  if (!canCreateSalesExchangeDraft) {
                    return
                  }
                  onOpenCreateSalesExchangeDialog(sourceOrderCandidate)
                }}
              >
                <ArrowLeftRight className='mr-1 size-3.5' />
                新建换货
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
