'use client'

import { ArrowRight, ClipboardList, Warehouse } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { WarehouseCategoryOption } from '../../category/data/schema'
import type { ShipmentDemand } from '../data/schema'

interface ShipmentDemandBoardProps {
  demands: ShipmentDemand[]
  warehouseCategories: WarehouseCategoryOption[]
  onPrepare: (demand: ShipmentDemand) => void
}

function formatQty(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : '0'
}

function categoryLabel(
  categories: WarehouseCategoryOption[],
  code: string
): string {
  return categories.find((category) => category.value === code)?.label || code
}

export function ShipmentDemandBoard({
  demands,
  warehouseCategories,
  onPrepare,
}: ShipmentDemandBoardProps) {
  return (
    <section className='flex flex-col gap-4'>
      <div className='flex flex-col gap-3 px-1 sm:flex-row sm:items-center sm:justify-between md:px-4'>
        <div className='flex items-center gap-3'>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600'>
            <ClipboardList className='size-5' />
          </div>
          <div>
            <h2 className='text-sm font-black tracking-widest text-slate-900'>
              订单待发货需求
            </h2>
            <p className='text-[10px] font-bold tracking-widest text-muted-foreground/50 uppercase'>
              仓库按订单缺口手动转入虚拟发货仓
            </p>
          </div>
        </div>
        <Badge className='w-fit rounded-full border-none bg-blue-500/10 px-3 py-1 text-[9px] font-black tracking-widest text-blue-600 uppercase'>
          {demands.length} 项待准备
        </Badge>
      </div>

      <div className='scrollbar-hide overflow-x-auto'>
        <table className='min-w-[1080px] border-separate border-spacing-y-2 px-1 text-sm md:min-w-full'>
          <thead>
            <tr className='bg-muted/5'>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                订单
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                产品型号
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                需求
              </th>
              <th className='px-4 py-3 text-left text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                库存
              </th>
              <th className='px-4 py-3 text-right text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {demands.length > 0 ? (
              demands.map((demand) => {
                const canPrepare =
                  demand.remainingToPrepare > 0 && demand.availableQty > 0
                const topStocks = demand.stockBreakdown
                  .filter((stock) => stock.quantity > 0)
                  .slice(0, 2)
                return (
                  <tr
                    key={`${demand.salesOrderId}-${demand.salesOrderLineId}`}
                    className='group bg-white/60 transition-all duration-300 hover:bg-white hover:shadow-sm'
                  >
                    <td className='rounded-l-xl border-l-4 border-l-transparent px-4 py-4 transition-colors group-hover:border-l-blue-500/40'>
                      <div className='flex flex-col gap-1'>
                        <span className='font-mono text-[10px] font-black tracking-widest text-slate-700 uppercase'>
                          {demand.orderNo}
                        </span>
                        <span className='max-w-[180px] truncate text-[9px] font-bold tracking-widest text-muted-foreground/40 uppercase'>
                          {demand.customerName}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-4'>
                      <div className='flex flex-col gap-1'>
                        <span className='max-w-[220px] truncate text-[12px] font-black tracking-tight text-slate-800 uppercase'>
                          {demand.materialName}
                        </span>
                        <span className='max-w-[220px] truncate font-mono text-[9px] font-bold tracking-widest text-muted-foreground/35 uppercase'>
                          {demand.materialCode || 'SKU'}{' '}
                          {demand.materialSpec
                            ? ` / ${demand.materialSpec}`
                            : ''}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-4'>
                      <div className='grid grid-cols-3 gap-2 text-[10px]'>
                        <Metric
                          label='订单'
                          value={demand.orderedQty}
                          uom={demand.uom}
                        />
                        <Metric
                          label='已发'
                          value={demand.deliveredQty}
                          uom={demand.uom}
                        />
                        <Metric
                          label='待转'
                          value={demand.remainingToPrepare}
                          uom={demand.uom}
                          strong
                        />
                      </div>
                    </td>
                    <td className='px-4 py-4'>
                      <div className='flex flex-col gap-2'>
                        <div
                          className={cn(
                            'flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase',
                            demand.availableQty > 0
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-500'
                          )}
                        >
                          <Warehouse className='size-3' />
                          可用 {formatQty(demand.availableQty)} {demand.uom}
                        </div>
                        <div className='flex flex-wrap gap-1.5'>
                          {topStocks.map((stock) => (
                            <Badge
                              key={`${stock.categoryCode}-${stock.batchNo}`}
                              variant='outline'
                              className='h-5 rounded-lg border-none bg-muted/30 px-2 text-[8px] font-black tracking-widest text-slate-500 uppercase'
                            >
                              {categoryLabel(
                                warehouseCategories,
                                stock.categoryCode
                              )}{' '}
                              {stock.batchNo || '默认批次'} ·{' '}
                              {formatQty(stock.quantity)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className='rounded-r-xl px-4 py-4 text-right'>
                      <Button
                        size='sm'
                        disabled={!canPrepare}
                        className='h-8 rounded-full bg-blue-600 px-4 text-[9px] font-black tracking-widest text-white uppercase shadow-lg shadow-blue-500/10 hover:bg-blue-700 disabled:bg-muted disabled:text-muted-foreground'
                        onClick={() => onPrepare(demand)}
                      >
                        转入虚拟发货仓 <ArrowRight className='ml-2 size-3' />
                      </Button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className='h-32 rounded-2xl bg-muted/5 text-center'
                >
                  <span className='text-[11px] font-black tracking-[0.25em] text-muted-foreground/25 uppercase'>
                    暂无订单待发货缺口
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  uom,
  strong,
}: {
  label: string
  value: number
  uom: string
  strong?: boolean
}) {
  return (
    <div className='flex min-w-[70px] flex-col gap-1'>
      <span className='font-black tracking-widest text-muted-foreground/30 uppercase'>
        {label}
      </span>
      <span
        className={cn(
          'font-mono text-[13px] font-black tabular-nums',
          strong ? 'text-blue-600' : 'text-slate-700'
        )}
      >
        {formatQty(value)} <span className='text-[8px] opacity-40'>{uom}</span>
      </span>
    </div>
  )
}
