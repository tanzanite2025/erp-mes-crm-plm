'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Layers,
  Package,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { BottomFloatingActionBar } from '@/components/layout/bottom-floating-action-bar'
import { type SalesOrder } from '@/features/trading/data/schema'

interface SelectionTreeProps {
  orders: SalesOrder[]
  selectedKeys: string[]
  onSelectionChange: (keys: string[]) => void
  onAnalyze: () => void
}

export function SelectionTree({
  orders,
  selectedKeys,
  onSelectionChange,
  onAnalyze,
}: SelectionTreeProps) {
  const { t } = useLanguage()
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [expandedProducts, setExpandedProducts] = useState<string[]>([])
  const toggleOrder = (id: string) => {
    setExpandedOrders((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const toggleProduct = (key: string) => {
    setExpandedProducts((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  const handleSelectLine = (
    orderNo: string,
    lineNo: number,
    checked: boolean
  ) => {
    const key = `${orderNo}-${lineNo}`
    if (checked) {
      onSelectionChange([...selectedKeys, key])
      return
    }
    onSelectionChange(selectedKeys.filter((item) => item !== key))
  }

  const handleSelectOrder = (order: SalesOrder, checked: boolean) => {
    const lineKeys = order.lines.map(
      (line) => `${order.orderNo}-${line.lineNo}`
    )
    if (checked) {
      onSelectionChange(Array.from(new Set([...selectedKeys, ...lineKeys])))
      return
    }
    onSelectionChange(selectedKeys.filter((item) => !lineKeys.includes(item)))
  }

  return (
    <div className='space-y-4 pb-24'>
      {orders.map((order) => {
        const isOrderExpanded = expandedOrders.includes(order.id)
        const orderLineKeys = order.lines.map(
          (line) => `${order.orderNo}-${line.lineNo}`
        )
        const isOrderAllSelected = orderLineKeys.every((key) =>
          selectedKeys.includes(key)
        )
        const isOrderSomeSelected =
          orderLineKeys.some((key) => selectedKeys.includes(key)) &&
          !isOrderAllSelected

        return (
          <Card
            key={order.id}
            className='overflow-hidden rounded-[32px] border-none bg-background/40 shadow-sm backdrop-blur-sm'
          >
            <div
              className={cn(
                'group flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors',
                isOrderExpanded ? 'bg-primary/5' : 'hover:bg-muted/30'
              )}
              onClick={() => toggleOrder(order.id)}
            >
              <div
                className='flex items-center gap-4'
                onClick={(event) => event.stopPropagation()}
              >
                <Checkbox
                  checked={
                    isOrderAllSelected
                      ? true
                      : isOrderSomeSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) =>
                    handleSelectOrder(order, !!checked)
                  }
                  className='h-5 w-5 rounded-lg border-2 border-primary/20 data-[state=checked]:bg-primary'
                />
              </div>

              <div className='flex size-8 items-center justify-center rounded-xl border bg-white shadow-sm transition-transform duration-500 group-hover:scale-110'>
                <ClipboardList className='size-4 text-primary' />
              </div>

              <div className='flex min-w-0 flex-1 flex-col'>
                <div className='flex items-center gap-3'>
                  <span className='text-sm font-black tracking-tight'>
                    {order.orderNo}
                  </span>
                  <Badge
                    variant='outline'
                    className='h-4 border-muted/50 px-1.5 py-0 text-[10px] font-black uppercase'
                  >
                    {order.customerName}
                  </Badge>
                </div>
                <div className='mt-0.5 flex items-center gap-4'>
                  <span className='flex items-center gap-1 text-[10px] font-bold text-muted-foreground/40 uppercase'>
                    <ShoppingCart className='size-3' />
                    {t('mrp.requirements.selectionTree.orderLines', {
                      count: order.lines.length,
                    })}
                  </span>
                  <span className='flex items-center gap-1 text-[10px] font-bold text-muted-foreground/40 uppercase'>
                    {t('mrp.requirements.selectionTree.deliveryDate', {
                      date: order.deliveryDate,
                    })}
                  </span>
                </div>
              </div>

              <div
                className={cn(
                  'rounded-xl bg-muted/20 p-2 text-muted-foreground/30 transition-all duration-500',
                  isOrderExpanded && 'rotate-180 bg-primary/10 text-primary'
                )}
              >
                <ChevronDown className='size-4' />
              </div>
            </div>

            {isOrderExpanded && (
              <div className='animate-in space-y-2 px-5 pt-1.5 pb-4 duration-500 fade-in slide-in-from-top-2'>
                {order.lines.map((line) => {
                  const selectionKey = `${order.orderNo}-${line.lineNo}`
                  const isProductSelected = selectedKeys.includes(selectionKey)
                  const isProductExpanded =
                    expandedProducts.includes(selectionKey)

                  return (
                    <div
                      key={line.lineNo}
                      className={cn(
                        'rounded-[20px] border border-dashed transition-all duration-300',
                        isProductSelected
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-muted/50 bg-muted/5'
                      )}
                    >
                      <div
                        className='flex cursor-pointer items-center gap-4 px-4 py-2.5'
                        onClick={() => toggleProduct(selectionKey)}
                      >
                        <div onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={isProductSelected}
                            onCheckedChange={(checked) =>
                              handleSelectLine(
                                order.orderNo,
                                line.lineNo,
                                !!checked
                              )
                            }
                            className='rounded-md border-primary/20'
                          />
                        </div>
                        <div className='flex size-7 items-center justify-center rounded-lg border bg-background'>
                          <Package className='size-3.5 text-muted-foreground/60' />
                        </div>
                        <div className='min-w-0 flex-1 pr-4'>
                          <div className='flex items-center justify-between'>
                            <div className='flex flex-col gap-1'>
                              <div className='flex max-w-[500px] items-start gap-2'>
                                <div className='mt-0.5 h-6 w-1.5 shrink-0 rounded-full bg-blue-600 shadow-[0_0_12px_rgba(37,99,235,0.6)]' />
                                <span className='rounded-lg bg-blue-50/80 px-1.5 py-0.5 text-[12px] leading-snug font-black tracking-tight text-blue-600'>
                                  {line.specification}
                                </span>
                              </div>
                              <div className='flex items-center gap-4 pl-2'>
                                <span className='rounded bg-slate-100 px-1 py-0.5 text-[8px] font-black tracking-[0.2em] text-slate-200 uppercase'>
                                  {t(
                                    'mrp.requirements.selectionTree.productCodeLabel'
                                  )}
                                  : {line.productCode}
                                </span>
                                <div className='size-1 rounded-full bg-slate-200' />
                                <span className='text-[8px] font-bold text-slate-300'>
                                  {t(
                                    'mrp.requirements.selectionTree.productModelLabel'
                                  )}
                                  : {line.productModel}
                                </span>
                              </div>
                            </div>
                            <div className='ml-4 flex shrink-0 items-center gap-3 rounded-xl border border-slate-800 bg-[#0F172A] px-3.5 py-1 shadow-2xl'>
                              <span className='text-[12px] font-black text-white tabular-nums'>
                                {line.qty.toLocaleString()}
                              </span>
                              <div className='h-3 w-px bg-white/20' />
                              <span className='text-[9px] font-black text-slate-500 uppercase'>
                                {line.uom}
                              </span>
                            </div>
                          </div>
                          {line.description && (
                            <div className='mt-1.5 pl-2 text-[10px] font-medium text-slate-400 opacity-60'>
                              {line.description}
                            </div>
                          )}
                        </div>
                        <div
                          className={cn(
                            'transition-transform duration-300',
                            isProductExpanded && 'rotate-90'
                          )}
                        >
                          <ChevronRight className='size-3 text-muted-foreground/30' />
                        </div>
                      </div>

                      {isProductExpanded && (
                        <p className='px-10 pb-3 text-sm text-muted-foreground'>
                          {t('mrp.requirements.selectionTree.basisReviewHint')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}

      {selectedKeys.length > 0 && (
        <BottomFloatingActionBar className='flex w-[min(calc(100vw-1.5rem),560px)] animate-in flex-col items-stretch gap-3 rounded-3xl border border-white/10 bg-[#0F172A] p-2 text-white shadow-2xl ring-1 ring-white/10 duration-500 slide-in-from-bottom-6 sm:w-fit sm:min-w-[320px] sm:flex-row sm:items-center sm:gap-6'>
          <div className='flex items-center gap-3 pl-4'>
            <div className='flex size-9 items-center justify-center rounded-2xl bg-primary shadow-[0_0_20px_rgba(var(--primary),0.5)]'>
              <Layers className='size-5 text-white' />
            </div>
            <div className='flex flex-col'>
              <span className='text-[12px] leading-none font-black tracking-tight'>
                {t('mrp.requirements.selectionTree.selectedCount', {
                  count: selectedKeys.length,
                })}
              </span>
              <span className='mt-1 text-[9px] font-bold tracking-widest text-slate-400 uppercase'>
                {t('mrp.requirements.selectionTree.analyzeReady')}
              </span>
            </div>
          </div>

          <div className='flex items-center justify-end gap-2 pr-2'>
            <button
              onClick={() => onSelectionChange([])}
              className='h-10 rounded-2xl px-4 text-[11px] font-black uppercase transition-colors hover:bg-white/5'
            >
              {t('mrp.requirements.selectionTree.cancel')}
            </button>
            <button
              onClick={onAnalyze}
              className='h-10 rounded-2xl bg-white px-6 text-[11px] font-black text-[#0F172A] uppercase shadow-xl transition-all hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100'
            >
              {t('mrp.requirements.selectionTree.analyze')}
            </button>
          </div>
        </BottomFloatingActionBar>
      )}
    </div>
  )
}
