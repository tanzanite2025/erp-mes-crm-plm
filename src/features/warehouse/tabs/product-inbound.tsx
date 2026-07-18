'use client'

import { Route } from '@/routes/_authenticated/warehouse/inbound'
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
import { Input } from '@/components/ui/input'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { PermissionBoundary } from '@/components/permission-boundary'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { ProductInboundFormDialog } from '../components/product-inbound-form-dialog'
import { useProductInboundViewModel } from '../hooks/use-product-inbound-view-model'
import { SalesExchangeReceivingQueueCard } from '../sales-exchange-receiving'
import { SalesReturnReceivingQueueCard } from '../sales-return-receiving'

export default function ProductInbound() {
  const { t } = useLanguage()
  const { mode } = Route.useSearch()
  const {
    readResource,
    searchResource,
    searchQuery,
    searchResults,
    isSearching,
    hasSearched,
    selectedItem,
    targetNodeDescription,
    isInboundOpen,
    formData,
    selectableWarehouseCategories,
    isSubmittingInbound,
    handleSearchQueryChange,
    handleOpenInboundForm,
    handleInboundDialogOpenChange,
    handleTargetCategoryChange,
    handleEntryDateChange,
    handleQuantityChange,
    handleBatchNoChange,
    handleRemarksChange,
    handleSubmitInbound,
    handleCloseInboundDialog,
    retryRead,
    retrySearch,
  } = useProductInboundViewModel()

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.inbound.title')}
          description={t('warehouse.inbound.subtitle')}
          icon={Package}
        />
        <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
          <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            入库基础数据加载失败
          </p>
          <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
            {readResource.error.message || '请重试后再进行产品入库。'}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void retryRead()
            }}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  if (readResource.status === 'loading') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          title={t('warehouse.inbound.title')}
          description={t('warehouse.inbound.subtitle')}
          icon={Package}
        />
        <div className='flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 px-6 text-center'>
          <Loader2 className='size-8 animate-spin text-primary/40' />
          <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            入库基础数据加载中
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        title={t('warehouse.inbound.title')}
        description={t('warehouse.inbound.subtitle')}
        icon={Package}
      />

      <SalesReturnReceivingQueueCard />
      <SalesExchangeReceivingQueueCard />

      <div className='flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center'>
        <div className='relative max-w-sm flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('warehouse.inbound.searchPlaceholder')}
            className='h-11 rounded-xl border-none bg-muted/50 pl-10 text-xs font-medium transition-all focus-visible:ring-1 focus-visible:ring-emerald-500/20 md:h-12 md:rounded-2xl md:text-sm'
            autoFocus={mode === 'scan'}
            value={searchQuery}
            onChange={(e) => handleSearchQueryChange(e.target.value)}
          />
          {isSearching && (
            <div className='pointer-events-none absolute top-1/2 right-4 -translate-y-1/2'>
              <RefreshCw className='size-3.5 animate-spin text-emerald-500' />
            </div>
          )}
        </div>
        <div className='flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.inventory}
            targetName={t('warehouse.inbound.title')}
            label={t('common.audit.trigger')}
            className='h-10 rounded-full px-4 md:h-11 md:px-5'
          />
          <div className='flex shrink-0 items-center gap-2 rounded-full border border-dashed border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-[8px] font-black tracking-widest text-emerald-600 uppercase md:px-4 md:text-[10px]'>
            <AlertCircle className='size-3 md:size-3.5' />
            {t('warehouse.inbound.archiveValidation')}
          </div>
        </div>
      </div>

      <div className='overflow-hidden rounded-2xl border border-dashed border-muted/50 bg-muted/5 shadow-inner md:rounded-[32px]'>
        <div className='flex items-center justify-between border-b border-dashed border-muted/50 bg-muted/30 px-4 py-3 text-left md:px-6 md:py-4'>
          <span className='truncate text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase md:text-[10px]'>
            {t('warehouse.inbound.results')}
          </span>
          <span className='shrink-0 text-[9px] font-black text-muted-foreground/60 italic md:text-[10px]'>
            {t('warehouse.inbound.resultCount', {
              count: searchResults.length,
            })}
          </span>
        </div>
        <div className='h-[320px] divide-y divide-dashed divide-muted overflow-y-auto px-2'>
          {searchResource.status === 'error' ? (
            <div className='flex h-full flex-col items-center justify-center px-6 text-center'>
              <AlertCircle className='size-8 text-rose-500' />
              <p className='mt-4 text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                搜索结果加载失败
              </p>
              <p className='mt-2 max-w-md text-[10px] leading-5 font-bold text-rose-700/80'>
                {searchResource.error.message || '请重试后再搜索主数据。'}
              </p>
              <Button
                type='button'
                variant='outline'
                className='mt-5 h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
                onClick={() => {
                  void retrySearch()
                }}
              >
                重试
              </Button>
            </div>
          ) : searchResource.status === 'loading' ? (
            <div className='flex h-full flex-col items-center justify-center px-6 text-center text-muted-foreground/40'>
              <Loader2 className='size-6 animate-spin text-emerald-500/60' />
              <p className='mt-4 text-[10px] font-black tracking-widest uppercase'>
                搜索中
              </p>
            </div>
          ) : searchResource.status === 'ready' && searchResults.length > 0 ? (
            searchResults.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group my-1 flex flex-col items-stretch justify-between gap-4 rounded-xl p-3 transition-all sm:flex-row sm:items-center md:rounded-[20px] md:p-4',
                  'cursor-pointer hover:bg-emerald-500/5'
                )}
                onClick={() => handleOpenInboundForm(item)}
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
                      {item.spec && (
                        <span className='truncate text-[9px] font-bold text-muted-foreground/40 italic opacity-60 md:text-[10px]'>
                          SPEC: {item.spec}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <PermissionBoundary permission='action_warehouse_inbound_record'>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='h-9 shrink-0 gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 text-[9px] font-black tracking-widest text-emerald-700 uppercase shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-500/15 md:h-10 md:px-5 md:text-[10px]'
                    onClick={(event) => {
                      event.stopPropagation()
                      handleOpenInboundForm(item)
                    }}
                  >
                    {t('warehouse.inbound.startInbound')}{' '}
                    <Plus className='size-3' />
                  </Button>
                </PermissionBoundary>
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
                {hasSearched
                  ? t('warehouse.inbound.emptyAfterSearchGuide')
                  : t('warehouse.inbound.emptyBeforeSearchGuide')}
              </p>
            </div>
          )}
        </div>
      </div>

      <ProductInboundFormDialog
        open={isInboundOpen}
        onOpenChange={handleInboundDialogOpenChange}
        formData={formData}
        selectableWarehouseCategories={selectableWarehouseCategories}
        targetNodeDescription={targetNodeDescription}
        itemUnit={selectedItem?.uom}
        isSubmittingInbound={isSubmittingInbound}
        onTargetCategoryChange={handleTargetCategoryChange}
        onEntryDateChange={handleEntryDateChange}
        onQuantityChange={handleQuantityChange}
        onBatchNoChange={handleBatchNoChange}
        onRemarksChange={handleRemarksChange}
        onSubmit={() => {
          void handleSubmitInbound()
        }}
        onCancel={handleCloseInboundDialog}
      />
    </div>
  )
}
