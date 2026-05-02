'use client'

import { useMemo } from 'react'
import { AlertCircle, Database, Loader2, Package, Plus, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { type InboundRecord } from '../inventory'
import { useProductInbound } from '../hooks/use-product-inbound'
import { ProductInboundFormDialog } from './product-inbound-form-dialog'

type ProductInboundActionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: (savedRecord: InboundRecord) => void
}

export function ProductInboundActionDialog({
  open,
  onOpenChange,
  onSubmitted,
}: ProductInboundActionDialogProps) {
  const { t } = useLanguage()
  const inbound = useProductInbound({
    enabled: open,
    onSubmitted: (savedRecord) => {
      onSubmitted?.(savedRecord)
    },
  })

  const targetNodeDescription = useMemo(() => {
    if (!inbound.selectedItem) return null
    return {
      name: inbound.selectedItem.name,
      code: inbound.selectedItem.code,
    }
  }, [inbound.selectedItem])

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      inbound.resetInboundSession()
    }
    onOpenChange(nextOpen)
  }

  const handleCloseInboundForm = () => {
    inbound.closeInboundDialog()
  }

  if (inbound.readResource.status === 'error' && isForbiddenError(inbound.readResource.error)) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className='w-[95vw] sm:max-w-[760px] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl'>
          <div className='absolute inset-0 bg-linear-to-br from-emerald-600/5 via-transparent pointer-events-none' />
          <div className='relative p-5 md:p-8 space-y-6'>
            <DialogHeader className='text-left'>
              <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase italic flex items-center gap-3'>
                <div className='size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0'>
                  <Package className='size-5 text-emerald-600' />
                </div>
                <span className='truncate'>{t('commandMenu.items.inboundAction')}</span>
              </DialogTitle>
              <DialogDescription className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/40'>
                {t('warehouse.inbound.subtitle')}
              </DialogDescription>
            </DialogHeader>

            {inbound.readResource.status === 'error' ? (
              <div className='flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                <p className='text-[10px] font-black uppercase tracking-widest text-rose-700'>入库基础数据加载失败</p>
                <p className='mt-3 max-w-xl text-[11px] font-bold leading-5 text-rose-700/80'>
                  {inbound.readResource.error.message || '请重试后再进行成品入库。'}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
                  onClick={() => {
                    void inbound.retryRead()
                  }}
                >
                  重试
                </Button>
              </div>
            ) : inbound.readResource.status === 'loading' ? (
              <div className='flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
                <Loader2 className='size-8 animate-spin text-primary/40' />
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>入库基础数据加载中</p>
              </div>
            ) : (
              <>
                <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4'>
                  <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
                    <Input
                      placeholder={t('warehouse.inbound.searchPlaceholder')}
                      className='pl-10 h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20 text-sm font-medium transition-all'
                      value={inbound.searchQuery}
                      onChange={(e) => inbound.setSearchQuery(e.target.value)}
                    />
                    {inbound.isSearching ? (
                      <div className='absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none'>
                        <RefreshCw className='size-3.5 text-emerald-500 animate-spin' />
                      </div>
                    ) : null}
                  </div>
                  <div className='flex items-center gap-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/5 px-3 md:px-4 py-2 rounded-full border border-dashed border-emerald-500/30 shrink-0'>
                    <AlertCircle className='size-3 md:size-3.5' />
                    {t('warehouse.inbound.archiveValidation')}
                  </div>
                </div>

                <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
                  <div className='bg-muted/30 px-4 md:px-6 py-3 md:py-4 border-b border-dashed border-muted/50 flex justify-between items-center text-left'>
                    <span className='text-[8px] md:text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest truncate'>{t('warehouse.inbound.results')}</span>
                    <span className='text-[9px] md:text-[10px] font-black text-muted-foreground/60 italic shrink-0'>
                      {t('warehouse.inbound.resultCount', { count: inbound.searchResults.length })}
                    </span>
                  </div>
                  <div className='h-[320px] overflow-y-auto divide-y divide-dashed divide-muted px-2'>
                    {inbound.searchResource.status === 'error' ? (
                      <div className='flex h-full flex-col items-center justify-center px-6 text-center'>
                        <AlertCircle className='size-8 text-rose-500' />
                        <p className='mt-4 text-[10px] font-black uppercase tracking-widest text-rose-700'>搜索结果加载失败</p>
                        <p className='mt-2 max-w-md text-[10px] font-bold leading-5 text-rose-700/80'>
                          {inbound.searchResource.error.message || '请重试后再搜索主数据。'}
                        </p>
                        <Button
                          type='button'
                          variant='outline'
                          className='mt-5 h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
                          onClick={() => {
                            void inbound.retrySearch()
                          }}
                        >
                          重试
                        </Button>
                      </div>
                    ) : inbound.searchResource.status === 'loading' ? (
                      <div className='flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground/40'>
                        <Loader2 className='size-6 animate-spin text-emerald-500/60' />
                        <p className='mt-4 text-[10px] font-black uppercase tracking-widest'>搜索中</p>
                      </div>
                    ) : inbound.searchResource.status === 'ready' && inbound.searchResults.length > 0 ? (
                      inbound.searchResults.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 md:p-4 transition-all group rounded-xl md:rounded-[20px] my-1 gap-4',
                            'hover:bg-emerald-500/5 cursor-pointer',
                          )}
                          onClick={() => inbound.openInboundForm(item)}
                        >
                          <div className='flex items-center gap-3 md:gap-5 overflow-hidden'>
                            <div className='size-10 md:size-12 rounded-xl md:rounded-2xl bg-background border border-muted/50 flex items-center justify-center shrink-0 shadow-sm group-hover:border-emerald-500/30 group-hover:scale-105 transition-all'>
                              <Package className='size-5 md:size-6 text-muted-foreground/30 group-hover:text-emerald-500 transition-colors' />
                            </div>
                            <div className='overflow-hidden space-y-0.5 md:space-y-1'>
                              <div className='flex items-center gap-2 md:gap-3'>
                                <h4 className='font-black text-sm md:text-[15px] text-slate-800 tracking-tighter uppercase transition-colors group-hover:text-emerald-700 italic truncate max-w-[150px] md:max-w-xs'>{item.name}</h4>
                                <Badge className={cn(
                                  'h-3.5 md:h-4 text-[7px] md:text-[8px] font-black px-1.5 md:px-2 uppercase tracking-widest border-none rounded-full shrink-0',
                                  item.sourceModule === 'PRODUCT' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'
                                )}>
                                  {item.sourceModule === 'PRODUCT' ? t('warehouse.inbound.product') : t('warehouse.inbound.material')}
                                </Badge>
                              </div>
                              <div className='flex items-center gap-3 md:gap-4 truncate'>
                                <span className='text-[9px] md:text-[10px] font-black font-mono text-muted-foreground/30 uppercase tracking-widest shrink-0'>SKU: {item.code}</span>
                                {item.spec ? <span className='text-[9px] md:text-[10px] font-bold text-muted-foreground/40 truncate italic opacity-60'>SPEC: {item.spec}</span> : null}
                              </div>
                            </div>
                          </div>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-9 md:h-10 rounded-full px-4 md:px-5 text-[9px] md:text-[10px] font-black uppercase tracking-widest gap-2 bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 transition-all shadow-lg shadow-emerald-500/10 shrink-0 hover:bg-emerald-500/15'
                            onClick={(event) => {
                              event.stopPropagation()
                              inbound.openInboundForm(item)
                            }}
                          >
                            {t('warehouse.inbound.startInbound')} <Plus className='size-3' />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className='h-full flex flex-col items-center justify-center px-6 text-center text-muted-foreground/20 italic'>
                        <div className='relative mb-4'>
                          <Search className='size-16 opacity-5' />
                          <div className='absolute inset-0 flex items-center justify-center'>
                            <Database className='size-8 opacity-10 animate-pulse' />
                          </div>
                        </div>
                        <p className='text-[10px] font-black uppercase tracking-widest'>{t('warehouse.inbound.idleTitle')}</p>
                        <p className='mt-3 max-w-md text-[10px] md:text-[11px] font-bold not-italic text-muted-foreground/45 leading-5'>
                          {inbound.hasSearched
                            ? t('warehouse.inbound.emptyAfterSearchGuide')
                            : t('warehouse.inbound.emptyBeforeSearchGuide')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ProductInboundFormDialog
        open={inbound.isInboundOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            handleCloseInboundForm()
          }
        }}
        formData={inbound.formData}
        selectableWarehouseCategories={inbound.selectableWarehouseCategories}
        targetNodeDescription={targetNodeDescription}
        itemUnit={inbound.selectedItem?.uom}
        isSubmittingInbound={inbound.isSubmittingInbound}
        onTargetCategoryChange={(value) => {
          inbound.setFormData((current) => ({ ...current, targetCategory: value }))
        }}
        onEntryDateChange={(value) => {
          inbound.setFormData((current) => ({ ...current, entryDate: value }))
        }}
        onQuantityChange={(value) => {
          inbound.setFormData((current) => ({ ...current, quantity: value }))
        }}
        onBatchNoChange={(value) => {
          inbound.setFormData((current) => ({ ...current, batchNo: value }))
        }}
        onRemarksChange={(value) => {
          inbound.setFormData((current) => ({ ...current, remarks: value }))
        }}
        onSubmit={() => {
          void inbound.submitInbound()
        }}
        onCancel={handleCloseInboundForm}
      />
    </>
  )
}
