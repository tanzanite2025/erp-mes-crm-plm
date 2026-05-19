import { useMemo, useState } from 'react'
import { Loader2, ShoppingCart } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ForbiddenState } from '@/components/forbidden-state'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import type { SalesOrder } from '../data/schema'
import { useSalesOrderAfterSalesCardController } from '../hooks/use-sales-order-after-sales-card-controller'
import { useSalesOrderListController } from '../hooks/use-sales-order-list-controller'
import { useSalesOrderPackagingCardController } from '../hooks/use-sales-order-packaging-card-controller'
import { SalesOrderReceivableDetailDialogBridge } from '../receivables/components/sales-order-receivable-detail-dialog-bridge'
import { SalesOrderAfterSalesCard } from './parts/sales-order-after-sales-card'
import { SalesOrderPackagingEntry } from './parts/sales-order-packaging-entry'
import { SalesOrderPackagingProfileDialogBridge } from './parts/sales-order-packaging-profile-dialog-bridge'
import { SalesOrderActionDialog } from './sales-order-action-dialog'
import { SalesOrderCanceledSection } from './sales-order-canceled-section'
import type { SalesOrderFeatureCardFactory } from './sales-order-card/sales-order-card-types'
import { SalesOrderDetailSheet } from './sales-order-detail-sheet'
import { SalesOrderListToolbar } from './sales-order-list-toolbar'
import { SalesOrderMaster } from './sales-order-master'
import { SalesOrderPreassembleScanDialog } from './sales-order-preassemble-scan-dialog'
import { TradingQueryErrorState } from './trading-query-error-state'

export function SalesOrderList() {
  const { t } = useLanguage()
  const controller = useSalesOrderListController()
  const [viewingReceivableOrderId, setViewingReceivableOrderId] = useState<
    string | null
  >(null)
  const packagingResourceOrders = useMemo(
    () =>
      controller.showCanceledSection
        ? [...controller.primaryOrders, ...controller.canceledOrders]
        : controller.primaryOrders,
    [
      controller.canceledOrders,
      controller.primaryOrders,
      controller.showCanceledSection,
    ]
  )
  const packagingController = useSalesOrderPackagingCardController(
    packagingResourceOrders
  )
  const afterSalesController = useSalesOrderAfterSalesCardController(
    packagingResourceOrders
  )
  const getOrderFeatureCards: SalesOrderFeatureCardFactory = (
    order: SalesOrder,
    context
  ) => {
    const packagingViewModel = packagingController.getViewModel(order)
    const afterSalesViewModel = afterSalesController.getViewModel(order)

    return [
      {
        id: 'packaging',
        priority: 20,
        render: () => (
          <SalesOrderPackagingEntry
            order={order}
            viewModel={packagingViewModel}
            readonly={context.readonly}
            isSelectionPending={packagingController.isSelectionPending}
            isFormSavePending={packagingController.isFormSavePending}
            onPersistLineSelection={packagingController.persistLineSelection}
            onStartCreateRule={packagingController.startCreateRule}
            onEditRule={packagingController.startEditRule}
          />
        ),
      },
      {
        id: 'after-sales',
        priority: 30,
        render: () => (
          <SalesOrderAfterSalesCard
            order={order}
            viewModel={afterSalesViewModel}
            readonly={context.readonly}
            onOpenReturns={afterSalesController.openReturns}
            onOpenExchanges={afterSalesController.openExchanges}
          />
        ),
      },
    ]
  }
  const handleViewReceivable = (order: SalesOrder) => {
    setViewingReceivableOrderId(order.id)
  }
  const handleReceivableDialogOpenChange = (open: boolean) => {
    if (!open) {
      setViewingReceivableOrderId(null)
    }
  }

  if (controller.listResource.status === 'loading') {
    return (
      <div className='flex h-[60vh] animate-in flex-col items-center justify-center space-y-4 duration-500 fade-in'>
        <div className='relative'>
          <Loader2 className='size-10 animate-spin text-primary opacity-20' />
          <ShoppingCart className='absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary' />
        </div>
        <p className='animate-pulse text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  if (controller.listResource.status === 'error') {
    if (isForbiddenError(controller.listResource.error))
      return <ForbiddenState />
    return (
      <TradingQueryErrorState
        title={t('tradingSalesOrder.master.errors.loadFailed')}
        error={controller.listResource.error}
        onRetry={controller.handleRetry}
      />
    )
  }

  return (
    <div className='flex min-h-0 flex-1 animate-in gap-6 overflow-hidden duration-700 fade-in'>
      <div className='flex min-h-0 w-full flex-col gap-5 transition-all duration-500'>
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

        <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-hidden'>
          <ScrollArea className='min-h-0 flex-1'>
            <div className='space-y-3 pr-1'>
              {controller.isRefreshingList ? (
                <div className='flex items-center justify-end gap-2 rounded-full border border-dashed border-primary/20 bg-primary/5 px-3 py-1.5 text-[9px] font-black tracking-widest text-primary/70 uppercase'>
                  <Loader2 className='size-3 animate-spin' />
                  刷新中
                </div>
              ) : null}

              <SalesOrderMaster
                orders={controller.primaryOrders}
                selectedId={controller.selectedId || undefined}
                onSelect={controller.handleOpenDetail}
                onPreassembleScan={
                  controller.preassemble.handleOpenPreassembleScan
                }
                onViewReceivable={handleViewReceivable}
                onEdit={controller.handleEditOrder}
                onDelete={controller.handleDeleteOrder}
                getFeatureCards={getOrderFeatureCards}
              />
            </div>
          </ScrollArea>

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
            onViewReceivable={handleViewReceivable}
            onEdit={controller.handleEditOrder}
            onDelete={controller.handleDeleteOrder}
            getFeatureCards={getOrderFeatureCards}
          />
        </div>

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

      <SalesOrderReceivableDetailDialogBridge
        open={Boolean(viewingReceivableOrderId)}
        orderId={viewingReceivableOrderId}
        onOpenChange={handleReceivableDialogOpenChange}
      />

      <SalesOrderPackagingProfileDialogBridge
        formController={packagingController.formController}
      />
    </div>
  )
}
