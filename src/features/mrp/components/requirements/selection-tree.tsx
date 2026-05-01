'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, ClipboardList, ExternalLink, Layers, Package, ShoppingCart } from 'lucide-react'
import { BottomFloatingActionBar } from '@/components/layout/bottom-floating-action-bar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useLanguage } from '@/context/language-provider'
import { cn } from '@/lib/utils'
import { createLogger } from '@/lib/logger'
import { BOMS_QUERY_KEY } from '@/features/engineering/query-keys'
import { bomService } from '@/features/engineering/services/bom-service'
import { type SalesOrder } from '@/features/trading/data/schema'
import { RequirementStageAlert } from './requirement-stage-alert'

const logger = createLogger('SelectionTree')

interface SelectionTreeProps {
  orders: SalesOrder[]
  selectedKeys: string[]
  onSelectionChange: (keys: string[]) => void
  onAnalyze: () => void
}

export function SelectionTree({ orders, selectedKeys, onSelectionChange, onAnalyze }: SelectionTreeProps) {
  const { t } = useLanguage()
  const [expandedOrders, setExpandedOrders] = useState<string[]>([])
  const [expandedProducts, setExpandedProducts] = useState<string[]>([])
  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
    select: (data) => data.filter((bom) => bom.status === 'active'),
  })
  const boms = useMemo(() => bomsQuery.data ?? [], [bomsQuery.data])

  const selectedMissingBomCount = selectedKeys.reduce((count, key) => {
    const [orderNo, rawLineNo] = key.split('-')
    const lineNo = Number(rawLineNo)
    const order = orders.find((entry) => entry.orderNo === orderNo)
    const line = order?.lines.find((entry) => entry.lineNo === lineNo)
    if (!line) return count
    const productBOM = boms.find((bom) => bom.productId === line.productId)
    return productBOM ? count : count + 1
  }, 0)

  useEffect(() => {
    if (!bomsQuery.error) return
    logger.error('Failed to load BOMs from backend', bomsQuery.error)
  }, [bomsQuery.error])

  const toggleOrder = (id: string) => {
    setExpandedOrders((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleProduct = (key: string) => {
    setExpandedProducts((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  const handleSelectLine = (orderNo: string, lineNo: number, checked: boolean) => {
    const key = `${orderNo}-${lineNo}`
    if (checked) {
      onSelectionChange([...selectedKeys, key])
      return
    }
    onSelectionChange(selectedKeys.filter((item) => item !== key))
  }

  const handleSelectOrder = (order: SalesOrder, checked: boolean) => {
    const lineKeys = order.lines.map((line) => `${order.orderNo}-${line.lineNo}`)
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
        const orderLineKeys = order.lines.map((line) => `${order.orderNo}-${line.lineNo}`)
        const isOrderAllSelected = orderLineKeys.every((key) => selectedKeys.includes(key))
        const isOrderSomeSelected = orderLineKeys.some((key) => selectedKeys.includes(key)) && !isOrderAllSelected

        return (
          <Card key={order.id} className='overflow-hidden border-none shadow-sm bg-background/40 backdrop-blur-sm rounded-[32px]'>
            <div className={cn('flex items-center gap-4 px-6 py-5 transition-colors cursor-pointer group', isOrderExpanded ? 'bg-primary/5' : 'hover:bg-muted/30')} onClick={() => toggleOrder(order.id)}>
              <div className='flex items-center gap-4' onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={isOrderAllSelected ? true : isOrderSomeSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => handleSelectOrder(order, !!checked)}
                  className='rounded-lg h-5 w-5 border-2 border-primary/20 data-[state=checked]:bg-primary'
                />
              </div>

              <div className='size-10 rounded-2xl bg-white border shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-500'>
                <ClipboardList className='size-5 text-primary' />
              </div>

              <div className='flex-1 flex flex-col min-w-0'>
                <div className='flex items-center gap-3'>
                  <span className='text-sm font-black tracking-tight italic'>{order.orderNo}</span>
                  <Badge variant='outline' className='text-[10px] font-black px-1.5 py-0 h-4 border-muted/50 uppercase'>
                    {order.customerName}
                  </Badge>
                </div>
                <div className='flex items-center gap-4 mt-0.5'>
                  <span className='text-[10px] font-bold text-muted-foreground/40 flex items-center gap-1 uppercase'>
                    <ShoppingCart className='size-3' />
                    {t('mrp.requirements.selectionTree.orderLines', { count: order.lines.length })}
                  </span>
                  <span className='text-[10px] font-bold text-muted-foreground/40 flex items-center gap-1 uppercase'>
                    {t('mrp.requirements.selectionTree.deliveryDate', { date: order.deliveryDate })}
                  </span>
                </div>
              </div>

              <div className={cn('p-2 rounded-xl bg-muted/20 text-muted-foreground/30 transition-all duration-500', isOrderExpanded && 'rotate-180 bg-primary/10 text-primary')}>
                <ChevronDown className='size-4' />
              </div>
            </div>

            {isOrderExpanded && (
              <div className='px-6 pb-6 pt-2 space-y-3 animate-in fade-in slide-in-from-top-2 duration-500'>
                {order.lines.map((line) => {
                  const selectionKey = `${order.orderNo}-${line.lineNo}`
                  const isProductSelected = selectedKeys.includes(selectionKey)
                  const isProductExpanded = expandedProducts.includes(selectionKey)
                  const productBOM = boms.find((bom) => bom.productId === line.productId)

                  return (
                    <div key={line.lineNo} className={cn('rounded-[24px] border border-dashed transition-all duration-300', isProductSelected ? 'border-primary/40 bg-primary/5' : 'border-muted/50 bg-muted/5')}>
                      <div className='flex items-center gap-4 px-5 py-4 cursor-pointer' onClick={() => toggleProduct(selectionKey)}>
                        <div onClick={(event) => event.stopPropagation()}>
                          <Checkbox checked={isProductSelected} onCheckedChange={(checked) => handleSelectLine(order.orderNo, line.lineNo, !!checked)} className='rounded-md border-primary/20' />
                        </div>
                        <div className='size-8 rounded-xl bg-background border flex items-center justify-center'>
                          <Package className='size-4 text-muted-foreground/60' />
                        </div>
                        <div className='flex-1 min-w-0 pr-4'>
                          <div className='flex items-center justify-between'>
                            <div className='flex flex-col gap-1.5'>
                              <div className='flex items-start gap-2 max-w-[500px]'>
                                <div className='w-1.5 h-6 bg-blue-600 rounded-full shadow-[0_0_12px_rgba(37,99,235,0.6)] mt-0.5 shrink-0' />
                                <span className='text-[16px] font-black text-blue-600 px-2 py-1 rounded-xl bg-blue-50/80 tracking-tight leading-snug italic'>
                                  {line.specification}
                                </span>
                              </div>
                              <div className='flex items-center gap-4 pl-4'>
                                <span className='text-[10px] font-black text-slate-200 uppercase tracking-[0.2em] bg-slate-100 px-1.5 py-0.5 rounded'>
                                  {t('mrp.requirements.selectionTree.productCodeLabel')}: {line.productCode}
                                </span>
                                <div className='size-1 rounded-full bg-slate-200' />
                                <span className='text-[9px] font-bold text-slate-300'>
                                  {t('mrp.requirements.selectionTree.productModelLabel')}: {line.productModel}
                                </span>
                              </div>
                            </div>
                            <div className='px-5 py-2 rounded-2xl bg-[#0F172A] border border-slate-800 shadow-2xl flex items-center gap-3 shrink-0 ml-4'>
                              <span className='text-[15px] font-black tabular-nums text-white'>{line.qty.toLocaleString()}</span>
                              <div className='w-px h-3 bg-white/20' />
                              <span className='text-[10px] font-black text-slate-500 uppercase'>{line.uom}</span>
                            </div>
                          </div>
                          {line.description && <div className='mt-2 pl-4 text-[10px] font-medium text-slate-400 opacity-60 italic'>{line.description}</div>}
                        </div>
                        <div className={cn('transition-transform duration-300', isProductExpanded && 'rotate-90')}>
                          <ChevronRight className='size-3 text-muted-foreground/30' />
                        </div>
                      </div>

                      {isProductExpanded && (
                        <div className='px-14 pb-5 space-y-2 animate-in fade-in duration-300'>
                          {!productBOM ? (
                            <RequirementStageAlert
                              tone='warning'
                              title={t('mrp.requirements.selectionTree.noBomTitle')}
                              description={t('mrp.requirements.selectionTree.noBom')}
                            />
                          ) : (
                            <>
                              <div className='text-[9px] font-black uppercase text-muted-foreground/30 tracking-[0.2em] mb-2 flex items-center justify-between'>
                                {t('mrp.requirements.selectionTree.bomPreview', { count: productBOM.items.length })}
                                <ExternalLink className='size-3 cursor-pointer hover:text-primary transition-colors' />
                              </div>
                              <div className='grid grid-cols-2 gap-2'>
                                {productBOM.items.slice(0, 4).map((item, index) => (
                                  <div key={index} className='flex items-center justify-between gap-3 p-2 rounded-xl bg-white/50 border border-muted/30 shadow-sm'>
                                    <div className='flex flex-col min-w-0'>
                                      <span className='text-[10px] font-black truncate'>{item.materialName}</span>
                                      <span className='text-[8px] font-bold text-muted-foreground/50 uppercase'>
                                        {item.section || t('mrp.requirements.selectionTree.otherSection')}
                                      </span>
                                    </div>
                                    <span className='text-[10px] font-black text-primary tabular-nums'>
                                      {(item.standardUsage * line.qty).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                                {productBOM.items.length > 4 && (
                                  <div className='col-span-2 text-center py-1 bg-muted/10 rounded-lg text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>
                                    {t('mrp.requirements.selectionTree.moreComponents', { count: productBOM.items.length - 4 })}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
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
        <BottomFloatingActionBar className='w-[min(calc(100vw-1.5rem),560px)] bg-[#0F172A] text-white p-2 rounded-3xl shadow-2xl flex flex-col items-stretch gap-3 border border-white/10 animate-in slide-in-from-bottom-6 duration-500 ring-1 ring-white/10 sm:w-fit sm:min-w-[320px] sm:flex-row sm:items-center sm:gap-6'>
          <div className='flex items-center gap-3 pl-4'>
            <div className='size-9 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.5)]'>
              <Layers className='size-5 text-white' />
            </div>
            <div className='flex flex-col'>
              <span className='text-[12px] font-black tracking-tight leading-none'>
                {t('mrp.requirements.selectionTree.selectedCount', { count: selectedKeys.length })}
              </span>
              <span className='text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest'>
                {selectedMissingBomCount > 0
                  ? t('mrp.requirements.selectionTree.blockedByMissingBom', { count: selectedMissingBomCount })
                  : t('mrp.requirements.selectionTree.analyzeReady')}
              </span>
            </div>
          </div>

          <div className='flex items-center justify-end gap-2 pr-2'>
            <button onClick={() => onSelectionChange([])} className='h-10 px-4 rounded-2xl text-[11px] font-black uppercase hover:bg-white/5 transition-colors'>
              {t('mrp.requirements.selectionTree.cancel')}
            </button>
            <button
              onClick={onAnalyze}
              disabled={selectedMissingBomCount > 0}
              className='h-10 px-6 rounded-2xl bg-white text-[#0F172A] text-[11px] font-black uppercase hover:scale-105 active:scale-95 transition-all shadow-xl disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100'
            >
              {t('mrp.requirements.selectionTree.analyze')}
            </button>
          </div>
        </BottomFloatingActionBar>
      )}
    </div>
  )
}
