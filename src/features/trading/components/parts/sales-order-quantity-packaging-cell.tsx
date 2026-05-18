import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '../../data/schema'

interface SalesOrderQuantitySummaryCardProps {
  order: SalesOrder
}

export function SalesOrderQuantitySummaryCard({ order }: SalesOrderQuantitySummaryCardProps) {
  const displayUom = order.lines.find((line) => line.uom?.trim())?.uom || 'PCS'

  return (
    <div className='flex h-full flex-col gap-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className='flex items-end gap-2'>
            <span className='text-[24px] font-black tracking-tighter text-primary tabular-nums'>
              {order.quantity?.toLocaleString() || 0}
            </span>
            <span className='pb-1 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
              {displayUom}
            </span>
          </div>
          <p className='mt-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
            当前订单总数量
          </p>
        </div>

        <span className='inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-[8px] font-mono font-black uppercase text-primary'>
          总量
        </span>
      </div>

      {order.status !== 'Draft' ? (
        <div className='mt-auto rounded-2xl bg-background/80 px-2.5 py-2 ring-1 ring-muted/40'>
          {typeof order.fulfillmentRate === 'number' ? (
            <>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[8px] font-black tracking-widest text-muted-foreground/55'>
                  履约进度
                </span>
                <span className='text-[11px] font-black tracking-tighter text-primary tabular-nums'>
                  {Math.round(order.fulfillmentRate)}%
                </span>
              </div>
              <div className='mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/30'>
                <div
                  className='h-full bg-primary transition-all duration-1000'
                  style={{
                    width: `${Math.min(100, Math.max(0, order.fulfillmentRate))}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <>
              {(() => {
                const error = new Error(
                  '[CRITICAL] Missing fulfillmentRate from sales order DTO'
                )
                failLoudly(
                  error,
                  'SalesOrderQuantitySummaryCard.fulfillmentRate'
                )
                return null
              })()}
              <div className='flex items-center justify-between gap-2'>
                <span className='text-[8px] font-black tracking-widest text-muted-foreground/55'>
                  履约进度
                </span>
                <span className='text-[11px] font-black tracking-tighter text-muted-foreground/30'>
                  --
                </span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export const SalesOrderQuantityPackagingCell = SalesOrderQuantitySummaryCard
