'use client'

import { useMemo } from 'react'
import {
  AlertCircle,
  Database,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { buildHostedQuickActionDialogContentClassName } from '@/components/hosted-quick-action-dialog.styles'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { useProductInbound } from '../hooks/use-product-inbound'
import { type InboundRecord } from '../inventory'
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

  if (
    inbound.readResource.status === 'error' &&
    isForbiddenError(inbound.readResource.error)
  ) {
    return null
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={buildHostedQuickActionDialogContentClassName(
            'flex flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl md:max-w-[760px]'
          )}
        >
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-600/5 via-transparent' />
          <div className='relative flex min-h-0 flex-1 flex-col gap-6 p-5 md:p-8'>
            <DialogHeader className='text-left'>
              <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0'>
                  <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tighter uppercase italic md:text-xl'>
                    <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10'>
                      <Package className='size-5 text-emerald-600' />
                    </div>
                    <span className='truncate'>
                      {t('commandMenu.items.inboundAction')}
                    </span>
                  </DialogTitle>
                  <DialogDescription className='text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    {t('warehouse.inbound.subtitle')}
                  </DialogDescription>
                </div>
                <AuditTimelineTriggerButton
                  module={AUDIT_MODULES.inventory}
                  targetName={t('commandMenu.items.inboundAction')}
                  label={t('common.audit.trigger')}
                  className='h-10 self-start rounded-full px-4'
                />
              </div>
            </DialogHeader>

            {inbound.readResource.status === 'error' ? (
              <div className='flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
                <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                  入库基础数据加载失败
                </p>
                <p className='mt-3 max-w-xl text-[11px] leading-5 font-bold text-rose-700/80'>
                  {inbound.readResource.error.message ||
                    '请重试后再进行成品入库。'}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
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
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  入库基础数据加载中
                </p>
              </div>
            ) : (
              <div className='flex min-h-0 flex-1 flex-col gap-6'>
                <div className='flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center'>
                  <div className='relative flex-1'>
                    <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
                    <Input
                      placeholder={t('warehouse.inbound.searchPlaceholder')}
                      className='h-12 rounded-2xl border-none bg-muted/50 pl-10 text-sm font-medium transition-all focus-visible:ring-1 focus-visible:ring-emerald-500/20'
                      value={inbound.searchQuery}
                      onChange={(e) => inbound.setSearchQuery(e.target.value)}
                    />
                    {inbound.isSearching ? (
                      <div className='pointer-events-none absolute top-1/2 right-4 -translate-y-1/2'>
                        <RefreshCw className='size-3.5 animate-spin text-emerald-500' />
                      </div>
                    ) : null}
                  </div>
                  <div className='flex shrink-0 items-center gap-2 rounded-full border border-dashed border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[8px] font-black tracking-widest text-emerald-600 uppercase md:px-4 md:text-[10px]'>
                    <AlertCircle className='size-3 md:size-3.5' />
                    {t('warehouse.inbound.archiveValidation')}
                  </div>
                </div>

                <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
                  <div className='flex items-center justify-between border-b border-dashed border-muted/50 bg-muted/30 px-4 py-3 text-left md:px-6 md:py-4'>
                    <span className='truncate text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
                      {t('warehouse.inbound.results')}
                    </span>
                    <span className='shrink-0 text-[9px] font-black text-muted-foreground/60 italic md:text-[10px]'>
                      {t('warehouse.inbound.resultCount', {
                        count: inbound.searchResults.length,
                      })}
                    </span>
                  </div>
                  <div className='min-h-0 flex-1 divide-y divide-dashed divide-muted overflow-y-auto px-2'>
                    {inbound.searchResource.status === 'error' ? (
                      <div className='flex h-full flex-col items-center justify-center px-6 text-center'>
                        <AlertCircle className='size-8 text-rose-500' />
                        <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                          搜索结果加载失败
                        </p>
                        <p className='mt-2 max-w-md text-[10px] leading-5 font-bold text-rose-700/80'>
                          {inbound.searchResource.error.message ||
                            '请重试后再搜索主数据。'}
                        </p>
                        <Button
                          type='button'
                          variant='outline'
                          className='mt-5 h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
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
                        <p className='mt-4 text-[10px] font-black tracking-widest uppercase'>
                          搜索中
                        </p>
                      </div>
                    ) : inbound.searchResource.status === 'ready' &&
                      inbound.searchResults.length > 0 ? (
                      inbound.searchResults.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'group my-1 flex flex-col items-stretch justify-between gap-4 rounded-xl p-3 transition-all sm:flex-row sm:items-center md:rounded-[20px] md:p-4',
                            'cursor-pointer hover:bg-emerald-500/5'
                          )}
                          onClick={() => inbound.openInboundForm(item)}
                        >
                          <div className='flex items-center gap-3 overflow-hidden md:gap-5'>
                            <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-muted/50 bg-background shadow-sm transition-all group-hover:scale-105 group-hover:border-emerald-500/30 md:size-12 md:rounded-2xl'>
                              <Package className='size-5 text-muted-foreground/30 transition-colors group-hover:text-emerald-500 md:size-6' />
                            </div>
                            <div className='space-y-0.5 overflow-hidden md:space-y-1'>
                              <div className='flex items-center gap-2 md:gap-3'>
                                <h4 className='max-w-[150px] truncate text-sm font-black tracking-tighter text-slate-800 uppercase italic transition-colors group-hover:text-emerald-700 md:max-w-xs md:text-[15px]'>
                                  {item.name}
                                </h4>
                                <Badge
                                  className={cn(
                                    'h-3.5 shrink-0 rounded-full border-none px-1.5 text-[7px] font-black tracking-widest uppercase md:h-4 md:px-2 md:text-[8px]',
                                    item.sourceModule === 'PRODUCT'
                                      ? 'bg-blue-500/10 text-blue-600'
                                      : 'bg-amber-500/10 text-amber-600'
                                  )}
                                >
                                  {item.sourceModule === 'PRODUCT'
                                    ? t('warehouse.inbound.product')
                                    : t('warehouse.inbound.material')}
                                </Badge>
                              </div>
                              <div className='flex items-center gap-3 truncate md:gap-4'>
                                <span className='shrink-0 font-mono text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase md:text-[10px]'>
                                  SKU: {item.code}
                                </span>
                                {item.spec ? (
                                  <span className='truncate text-[9px] font-bold text-muted-foreground/40 italic opacity-60 md:text-[10px]'>
                                    SPEC: {item.spec}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <Button
                            size='sm'
                            variant='ghost'
                            className='h-9 shrink-0 gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 text-[9px] font-black tracking-widest text-emerald-700 uppercase shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-500/15 md:h-10 md:px-5 md:text-[10px]'
                            onClick={(event) => {
                              event.stopPropagation()
                              inbound.openInboundForm(item)
                            }}
                          >
                            {t('warehouse.inbound.startInbound')}{' '}
                            <Plus className='size-3' />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground/20 italic'>
                        <div className='relative mb-4'>
                          <Search className='size-16 opacity-5' />
                          <div className='absolute inset-0 flex items-center justify-center'>
                            <Database className='size-8 animate-pulse opacity-10' />
                          </div>
                        </div>
                        <p className='text-[10px] font-black tracking-widest uppercase'>
                          {t('warehouse.inbound.idleTitle')}
                        </p>
                        <p className='mt-3 max-w-md text-[10px] leading-5 font-bold text-muted-foreground/45 not-italic md:text-[11px]'>
                          {inbound.hasSearched
                            ? t('warehouse.inbound.emptyAfterSearchGuide')
                            : t('warehouse.inbound.emptyBeforeSearchGuide')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
          inbound.setFormData((current) => ({
            ...current,
            targetCategory: value,
          }))
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
