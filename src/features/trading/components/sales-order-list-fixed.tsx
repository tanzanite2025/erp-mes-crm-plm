import { Loader2, ShoppingCart } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderListController } from '../hooks/use-sales-order-list-controller'
import { SalesOrderActionDialog } from './sales-order-action-dialog'
import { SalesOrderCanceledSection } from './sales-order-canceled-section'
import { SalesOrderDetailSheet } from './sales-order-detail-sheet'
import { SalesOrderListToolbar } from './sales-order-list-toolbar'
import { SalesOrderMaster } from './sales-order-master'
import { SalesOrderPackagingEntry } from './parts/sales-order-packaging-entry'
import { SalesOrderPreassembleScanDialog } from './sales-order-preassemble-scan-dialog'
import { TradingQueryErrorState } from './trading-query-error-state'

export function SalesOrderList() {
  const { t } = useLanguage()
  const controller = useSalesOrderListController()
  const renderOrderFeatureCards = (order: SalesOrder) => (
    <SalesOrderPackagingEntry order={order} />
  )

  if (controller.listResource.status === 'loading') {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center space-y-4 animate-in fade-in duration-500'>
        <div className='relative'>
          <Loader2 className='size-10 text-primary animate-spin opacity-20' />
          <ShoppingCart className='size-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' />
        </div>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  if (controller.listResource.status === 'error') {
    if (isForbiddenError(controller.listResource.error)) return <ForbiddenState />
    return (
      <TradingQueryErrorState
        title={t('tradingSalesOrder.master.errors.loadFailed')}
        error={controller.listResource.error}
        onRetry={controller.handleRetry}
      />
    )
  }

  return (
    <div className='flex min-h-0 flex-1 gap-6 overflow-hidden animate-in fade-in duration-700'>
      <div className='flex w-full flex-col gap-6 transition-all duration-500'>
        <SalesOrderListToolbar
          searchTerm={controller.searchTerm}
          onSearchTermChange={controller.setSearchTerm}
          statusFilter={controller.statusFilter}
          onStatusFilterChange={controller.setStatusFilter}
          paymentMethodFilter={controller.paymentMethodFilter}
          onPaymentMethodFilterChange={controller.setPaymentMethodFilter}
          paymentTermFilter={controller.paymentTermFilter}
          onPaymentTermFilterChange={controller.setPaymentTermFilter}
          paymentMethodOptions={controller.paymentMethodOptions}
          paymentTermOptions={controller.paymentTermOptions}
          financeFilterStatus={controller.financeFilterStatus}
          financeFilterErrorMessage={controller.financeFilterErrorMessage}
          onRetryFinanceFilters={controller.handleRetryFinanceFilters}
          onAddOrder={controller.handleAddOrder}
          hasCustomerContext={controller.hasCustomerContext}
          customerContextLabel={controller.customerContextLabel}
          onClearCustomerContext={controller.handleClearCustomerContext}
        />

        <ScrollArea className='flex-1 border-2 border-dashed border-muted/50 rounded-[32px] bg-muted/5'>
          <div className='p-4 space-y-4'>
            <SalesOrderMaster
              orders={controller.primaryOrders}
              selectedId={controller.selectedId || undefined}
              onSelect={controller.handleOpenDetail}
              onPreassembleScan={controller.preassemble.handleOpenPreassembleScan}
              onEdit={controller.handleEditOrder}
              onDelete={controller.handleDeleteOrder}
              renderFeatureCards={renderOrderFeatureCards}
            />

            <SalesOrderCanceledSection
              shouldLoadCanceledSection={controller.shouldLoadCanceledSection}
              canceledOrders={controller.canceledOrders}
              canceledTotal={controller.canceledTotal}
              selectedId={controller.selectedId || undefined}
              showCanceledSection={controller.showCanceledSection}
              onToggle={controller.handleToggleCanceledSection}
              pageSize={controller.pageSize}
              canceledPage={controller.canceledPage}
              onCanceledPageChange={controller.setCanceledPage}
              onSelect={controller.handleOpenDetail}
              onPreassembleScan={controller.preassemble.handleOpenPreassembleScan}
              onEdit={controller.handleEditOrder}
              onDelete={controller.handleDeleteOrder}
              renderFeatureCards={renderOrderFeatureCards}
            />
          </div>
        </ScrollArea>

        {controller.total > controller.pageSize && (
          <CompactPaginationControls
            className='mt-2'
            page={controller.page}
            totalPages={Math.ceil(controller.total / controller.pageSize)}
            onPageChange={controller.setPage}
          />
        )}
      </div>

      <SalesOrderDetailSheet {...controller.detailSheetState} />

      <SalesOrderActionDialog {...controller.actionDialogState} />

      <SalesOrderPreassembleScanDialog {...controller.preassembleDialogState} />
    </div>
  )
}
