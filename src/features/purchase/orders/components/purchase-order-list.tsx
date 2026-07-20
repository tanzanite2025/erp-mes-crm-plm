import { useEffect, useMemo, useState } from 'react'
import { Route } from '@/routes/_authenticated/purchase/orders'
import { Loader2 } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ForbiddenState } from '@/components/forbidden-state'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { PurchaseOrderPayableDetailDialogBridge } from '@/features/trading/payables/components/purchase-order-payable-detail-dialog-bridge'
import { type PurchaseOrderListItem } from '../data/schema'
import { usePurchaseOrderFilterOptions } from '../hooks/use-purchase-order-filter-options'
import { usePurchaseOrderListViewModel } from '../hooks/use-purchase-order-list-view-model'
import {
  useGetPurchaseOrders,
  usePurchaseOrderMutations,
} from '../hooks/use-purchase-orders'
import { PurchaseOrderActionDialog } from './purchase-order-action-dialog'
import { PurchaseOrderDetailSheet } from './purchase-order-detail-sheet'
import { PurchaseOrderListToolbar } from './purchase-order-list-toolbar'
import { PurchaseOrderMaster } from './purchase-order-master'

const logger = createLogger('PurchaseOrderList')

type PurchaseOrderListResource = CompositeReadResource<{
  orders: PurchaseOrderListItem[]
  total: number
}>

export function PurchaseOrderList() {
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const { search, detailId } = Route.useSearch()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const ordersQuery = useGetPurchaseOrders(page, pageSize)
  const { deleteMutation } = usePurchaseOrderMutations()
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] =
    useState<PurchaseOrderListItem | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [paymentTermFilter, setPaymentTermFilter] = useState('ALL')
  const [viewingPayableOrderId, setViewingPayableOrderId] = useState<
    string | null
  >(null)
  const navigate = Route.useNavigate()
  const searchTerm = search || ''
  const selectedId = detailId || undefined
  const isDetailOpen = Boolean(detailId)

  const listResource = useMemo<PurchaseOrderListResource>(() => {
    const failure = resolveQueryFailure({
      data: ordersQuery.data,
      error: ordersQuery.error,
      isPending: ordersQuery.isPending,
      scope: 'PurchaseOrderList.orders',
      missingMessage: '[CRITICAL] Purchase order list missing after load',
      failureMessage: '[CRITICAL] Purchase order list query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (ordersQuery.isPending) {
      return { status: 'loading' }
    }

    const listData = ordersQuery.data
    if (!listData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Purchase order list missing after load'),
        scope: 'PurchaseOrderList.orders',
      }
    }

    return {
      status: 'ready',
      orders: listData.items,
      total: listData.total,
    }
  }, [ordersQuery.data, ordersQuery.error, ordersQuery.isPending])

  useEffect(() => {
    if (listResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load purchase order list: ${listResource.scope}`,
      listResource.error
    )
    failLoudly(listResource.error, listResource.scope)
  }, [listResource])

  const orders = useMemo(
    () => (listResource.status === 'ready' ? listResource.orders : []),
    [listResource]
  )
  const total = listResource.status === 'ready' ? listResource.total : 0

  const financeFilterOptions = usePurchaseOrderFilterOptions(orders)
  const paymentMethodOptions = financeFilterOptions.paymentMethodOptions
  const paymentTermOptions = financeFilterOptions.paymentTermOptions
  const { filteredOrders, selectedOrder } = usePurchaseOrderListViewModel({
    orders,
    searchTerm,
    statusFilter,
    paymentMethodFilter,
    paymentTermFilter,
    selectedId,
  })

  const handleAddOrder = () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    setEditingOrder(null)
    setIsActionDialogOpen(true)
  }

  const handleEditOrder = (order: PurchaseOrderListItem) => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    setEditingOrder(order)
    setIsActionDialogOpen(true)
  }

  const handleDeleteOrder = (id: string) => {
    if (!allowsAction('action_trading_purchase_order_delete')) return
    const order = orders.find((item) => item.id === id)
    if (
      order?.status !== 'Canceled' &&
      !confirm(t('purchase.orders.deleteConfirm'))
    )
      return
    deleteMutation.mutate(id)
  }

  const handleViewPayable = (order: PurchaseOrderListItem) => {
    setViewingPayableOrderId(order.id)
  }

  const handlePayableDialogOpenChange = (open: boolean) => {
    if (!open) {
      setViewingPayableOrderId(null)
    }
  }

  if (listResource.status === 'loading') {
    return (
      <div className='flex h-[60vh] animate-in flex-col items-center justify-center space-y-4 duration-500 fade-in'>
        <Loader2 className='size-10 animate-spin text-primary opacity-20' />
        <p className='animate-pulse text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
          {t('purchase.orders.loading')}
        </p>
      </div>
    )
  }

  if (listResource.status === 'error' && isForbiddenError(listResource.error)) {
    return <ForbiddenState />
  }

  if (listResource.status === 'error') {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <div className='flex min-h-[360px] flex-col items-center justify-center rounded-[32px] border border-dashed border-rose-500/25 bg-rose-500/3 px-6 text-center'>
          <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
            采购订单列表加载失败
          </p>
          <p className='mt-3 max-w-2xl text-[11px] leading-5 font-bold text-rose-700/80'>
            {listResource.error.message || '请重试后再查看采购订单列表。'}
          </p>
          <Button
            type='button'
            variant='outline'
            className='mt-5 h-10 rounded-full border-dashed px-6 text-[10px] font-black tracking-widest uppercase'
            onClick={() => {
              void ordersQuery.refetch()
            }}
          >
            重试
          </Button>
        </div>
      </div>
    )
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      navigate({
        search: (prev) => ({
          search: prev.search,
          detailId: '',
        }),
        replace: true,
      })
    }
  }

  const handleSearchTermChange = (value: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: value || undefined,
      }),
      replace: true,
    })
  }

  const handleSelectOrder = (id: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        detailId: id,
      }),
      replace: true,
    })
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <PurchaseOrderListToolbar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        paymentMethodFilter={paymentMethodFilter}
        paymentTermFilter={paymentTermFilter}
        financeFilterStatus={
          financeFilterOptions.readResource.status === 'error'
            ? 'error'
            : financeFilterOptions.readResource.status === 'loading'
              ? 'loading'
              : 'ready'
        }
        financeFilterErrorMessage={
          financeFilterOptions.readResource.status === 'error'
            ? financeFilterOptions.readResource.error.message
            : undefined
        }
        onRetryFinanceFilters={() => {
          void financeFilterOptions.retry()
        }}
        paymentMethodOptions={paymentMethodOptions}
        paymentTermOptions={paymentTermOptions}
        onSearchTermChange={handleSearchTermChange}
        onStatusFilterChange={setStatusFilter}
        onPaymentMethodFilterChange={setPaymentMethodFilter}
        onPaymentTermFilterChange={setPaymentTermFilter}
        onAddOrder={handleAddOrder}
      />

      <div className='flex flex-col gap-4 rounded-[32px] border border-dashed border-muted/50 bg-background/50 p-2 shadow-sm'>
        <PurchaseOrderMaster
          orders={filteredOrders}
          selectedId={selectedId}
          onSelect={handleSelectOrder}
          onViewPayable={handleViewPayable}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
        />

        {total > pageSize && (
          <div className='flex items-center justify-center gap-6 rounded-2xl border border-dashed border-muted/30 bg-muted/5 py-4'>
            <Button
              variant='ghost'
              size='sm'
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className='h-9 px-6 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-white hover:shadow-md'
            >
              {t('purchase.orders.prevPage')}
            </Button>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] font-black text-muted-foreground/40'>
                {t('purchase.orders.page')}
              </span>
              <span className='border-b-2 border-primary/20 pb-0.5 text-[12px] font-black tabular-nums'>
                {page}
              </span>
              <span className='text-[10px] font-black text-muted-foreground/40'>
                / {Math.ceil(total / pageSize)}
              </span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((prev) => prev + 1)}
              className='h-9 px-6 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-white hover:shadow-md'
            >
              {t('purchase.orders.nextPage')}
            </Button>
          </div>
        )}
      </div>

      <PurchaseOrderDetailSheet
        open={isDetailOpen}
        order={selectedOrder}
        title={t('purchase.orders.detailTitle')}
        onOpenChange={handleOpenChange}
        onDelete={handleDeleteOrder}
      />

      <PurchaseOrderActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        order={editingOrder}
      />

      <PurchaseOrderPayableDetailDialogBridge
        open={Boolean(viewingPayableOrderId)}
        orderId={viewingPayableOrderId}
        onOpenChange={handlePayableDialogOpenChange}
      />
    </div>
  )
}
