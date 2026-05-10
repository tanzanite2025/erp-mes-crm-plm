import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '../../data/schema'

interface SalesOrderQuantitySummaryCardProps {
  order: SalesOrder
}

export function SalesOrderQuantitySummaryCard({ order }: SalesOrderQuantitySummaryCardProps) {
  const displayUom = order.lines.find((line) => line.uom?.trim())?.uom || 'PCS'

  return (
    <div className='space-y-1.5'>
      <div className='flex items-end justify-between gap-2'>
        <div className='flex items-end gap-1.5'>
          <span className='text-[16px] font-black tracking-tighter text-primary tabular-nums'>
            {order.quantity?.toLocaleString() || 0}
          </span>
          <span className='pb-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
            {displayUom}
          </span>
        </div>

        {order.status !== 'Draft' && typeof order.fulfillmentRate === 'number' ? (
          <span className='text-[10px] font-black tracking-tight text-primary tabular-nums'>
            {Math.round(order.fulfillmentRate)}%
          </span>
        ) : null}
      </div>

      {order.status !== 'Draft' && (
        <div className='space-y-1'>
          {typeof order.fulfillmentRate === 'number' ? (
            <>
              <div className='flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                <span>履约进度</span>
                <span>{Math.round(order.fulfillmentRate)}%</span>
              </div>
              <div className='h-1.5 w-full overflow-hidden rounded-full bg-muted shadow-inner'>
                <div
                  className='h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-1000'
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
              <span className='text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
                --
              </span>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export const SalesOrderQuantityPackagingCell = SalesOrderQuantitySummaryCard
