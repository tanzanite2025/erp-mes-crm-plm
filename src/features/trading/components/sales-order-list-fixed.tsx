import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { isForbiddenError } from '@/lib/error-status'
import { useAuthStore } from '@/stores/auth-store'
import { type SalesOrder, type SalesOrderStatus, salesOrderStatuses } from '../data/schema'
import { useTradingFinanceResources } from '../hooks/use-trading-finance-resources'
import { useGetSalesOrders, useSalesOrderMutations } from '../sales'
import { requireTradingCommandActor } from '../utils/command-actor'
import { SalesOrderActionDialog } from './sales-order-action-dialog'
import { SalesOrderDetailSheet } from './sales-order-detail-sheet'
import { SalesOrderMaster } from './sales-order-master'
import { TradingQueryErrorState } from './trading-query-error-state'

const salesOrderStatusLabelKeyMap: Record<SalesOrderStatus, 'draft' | 'pending' | 'inProgress' | 'done' | 'canceled'> = {
  Draft: 'draft',
  Pending: 'pending',
  InProgress: 'inProgress',
  Done: 'done',
  Canceled: 'canceled',
}

function toSalesOrderStatusKey(status: SalesOrderStatus) {
  return salesOrderStatusLabelKeyMap[status]
}

export function SalesOrderList() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/trading/sales-orders' })
  const user = useAuthStore((state) => state.user)
  const routeCustomerId = search.customerId || undefined
  const routeCustomerName = search.customerName || undefined

  const [page, setPage] = useState(1)
  const [canceledPage, setCanceledPage] = useState(1)
  const [pageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState(search.search || '')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [paymentTermFilter, setPaymentTermFilter] = useState('ALL')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)
  const [showCanceledSection, setShowCanceledSection] = useState(false)

  const selectedId = search.detailId || undefined
  const normalizedSearchTerm = searchTerm.trim()
  const isAllStatusesFilter = statusFilter === 'all'
  const isCanceledOnlyFilter = statusFilter.toLowerCase() === 'canceled'
  const shouldLoadCanceledSection = isAllStatusesFilter
  const hasCustomerContext = Boolean(routeCustomerId || routeCustomerName)
  const customerContextLabel = routeCustomerName?.trim() || routeCustomerId || ''
  const normalizedPaymentMethodFilter =
    paymentMethodFilter !== 'ALL' ? paymentMethodFilter : undefined
  const normalizedPaymentTermFilter =
    paymentTermFilter !== 'ALL' ? paymentTermFilter : undefined

  const primaryStatusFilter = useMemo(
    () => (isAllStatusesFilter ? ['Draft', 'Pending', 'InProgress', 'Done'] : [statusFilter]),
    [isAllStatusesFilter, statusFilter]
  )

  const primaryOrdersQuery = useGetSalesOrders(page, pageSize, {
    customerId: routeCustomerId,
    keyword: normalizedSearchTerm,
    status: primaryStatusFilter,
    paymentMethod: normalizedPaymentMethodFilter,
    paymentTerm: normalizedPaymentTermFilter,
  })
  const canceledOrdersQuery = useGetSalesOrders(canceledPage, pageSize, {
    customerId: routeCustomerId,
    keyword: normalizedSearchTerm,
    status: ['Canceled'],
    paymentMethod: normalizedPaymentMethodFilter,
    paymentTerm: normalizedPaymentTermFilter,
    enabled: shouldLoadCanceledSection,
  })

  const { deleteMutation, cancelMutation } = useSalesOrderMutations()

  const primaryOrders = useMemo(
    () => primaryOrdersQuery.data?.items ?? [],
    [primaryOrdersQuery.data?.items]
  )
  const canceledOrders = useMemo(
    () => (shouldLoadCanceledSection ? canceledOrdersQuery.data?.items ?? [] : []),
    [canceledOrdersQuery.data?.items, shouldLoadCanceledSection]
  )
  const allLoadedOrders = useMemo(
    () => (shouldLoadCanceledSection ? [...primaryOrders, ...canceledOrders] : primaryOrders),
    [canceledOrders, primaryOrders, shouldLoadCanceledSection]
  )

  const total = primaryOrdersQuery.data?.total || 0
  const canceledTotal = shouldLoadCanceledSection ? canceledOrdersQuery.data?.total || 0 : 0

  const { paymentMethods, paymentTerms } = useTradingFinanceResources()
  const paymentMethodOptions = useMemo(
    () =>
      paymentMethods
        .map((item) => ({
          value: item.code,
          label: item.name || item.code,
        }))
        .filter((option) => option.value.trim().length > 0)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [paymentMethods]
  )
  const paymentTermOptions = useMemo(
    () =>
      paymentTerms
        .map((item) => ({
          value: item.code,
          label: item.name || item.code,
        }))
        .filter((option) => option.value.trim().length > 0)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [paymentTerms]
  )
  const selectedOrder = useMemo(
    () => allLoadedOrders.find((order) => order.id === selectedId),
    [allLoadedOrders, selectedId]
  )
  const isLoading = primaryOrdersQuery.isLoading
  const isError = primaryOrdersQuery.isError
  const error = primaryOrdersQuery.error

  const { runConfirmedAction } = useConfirmedActionFlow()

  useEffect(() => {
    setPage(1)
    setCanceledPage(1)
  }, [
    normalizedSearchTerm,
    routeCustomerId,
    routeCustomerName,
    statusFilter,
    paymentMethodFilter,
    paymentTermFilter,
  ])

  useEffect(() => {
    if (isCanceledOnlyFilter || selectedOrder?.status === 'Canceled') {
      setShowCanceledSection(true)
    }
    if (!shouldLoadCanceledSection) {
      setShowCanceledSection(false)
    }
  }, [isCanceledOnlyFilter, selectedOrder?.status, shouldLoadCanceledSection])

  const handleAddOrder = () => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_manage',
      onAction: () => {
        setEditingOrder(null)
        setIsActionDialogOpen(true)
      },
    })
  }

  const handleEditOrder = (order: SalesOrder) => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_manage',
      onAction: () => {
        setEditingOrder(order)
        setIsActionDialogOpen(true)
      },
    })
  }

  const handleDeleteOrder = (id: string) => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_delete',
      confirmKey: 'common.actions.delete',
      onAction: () => {
        if (cancelMutation.isPending || deleteMutation.isPending) return

        const order = allLoadedOrders.find((item) => item.id === id)
        if (!order) return
        if (order.status === 'Canceled') {
          deleteMutation.mutate(id)
          return
        }

        const actor = requireTradingCommandActor(
          { operator: user?.accountNo, actorId: user?.id },
          'SalesOrderList.handleDeleteOrder'
        )
        cancelMutation.mutate({
          orderId: id,
          operator: actor.operator,
          actorId: actor.actorId,
          expectedVersion: order.version,
        })
      },
    })
  }

  const handleDeleteOrderFromDetail = (order: SalesOrder) => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_delete',
      confirmKey: 'common.actions.delete',
      onAction: () => {
        if (cancelMutation.isPending || deleteMutation.isPending) return

        if (order.status === 'Canceled') {
          deleteMutation.mutate(order.id)
          return
        }

        const actor = requireTradingCommandActor(
          { operator: user?.accountNo, actorId: user?.id },
          'SalesOrderList.handleDeleteOrderFromDetail'
        )

        cancelMutation.mutate({
          orderId: order.id,
          operator: actor.operator,
          actorId: actor.actorId,
          expectedVersion: order.version,
        })
      },
    })
  }

  const handleOpenDetail = (id: string) => {
    navigate({
      to: '/trading/sales-orders',
      search: (prev) => ({
        ...prev,
        detailId: id,
        customerId: routeCustomerId,
        customerName: routeCustomerName,
      }),
    })
  }

  const handleCloseDetail = () => {
    navigate({
      to: '/trading/sales-orders',
      search: (prev) => ({
        ...prev,
        detailId: undefined,
        customerId: routeCustomerId,
        customerName: routeCustomerName,
      }),
    })
  }

  const handleClearCustomerContext = () => {
    navigate({
      to: '/trading/sales-orders',
      search: (prev) => ({
        ...prev,
        customerId: undefined,
        customerName: undefined,
      }),
    })
  }

  const handleRetry = () => {
    void primaryOrdersQuery.refetch()
    if (shouldLoadCanceledSection) {
      void canceledOrdersQuery.refetch()
    }
  }

  if (isLoading) {
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

  if (isError) {
    if (isForbiddenError(error)) return <ForbiddenState />
    return (
      <TradingQueryErrorState
        title={t('tradingSalesOrder.master.errors.loadFailed')}
        error={error}
        onRetry={handleRetry}
      />
    )
  }

  return (
    <div className='flex min-h-0 flex-1 gap-6 overflow-hidden animate-in fade-in duration-700'>
      <div className='flex w-full flex-col gap-6 transition-all duration-500'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center justify-between px-1'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
            <Input
              placeholder={t('tradingSalesOrder.linesEditor.selectDesktop')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 h-11 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-[13px] font-medium shadow-inner'
            />
          </div>

          <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end'>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='h-11 w-full sm:w-[180px] rounded-full border-dashed bg-background/80 font-bold shadow-sm'>
                <SelectValue placeholder={t('tradingSalesOrder.master.filters.status')} />
              </SelectTrigger>
              <SelectContent className='rounded-2xl'>
                <SelectItem value='all'>{t('tradingSalesOrder.master.filters.allStatuses')}</SelectItem>
                {salesOrderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {t(`tradingSalesOrder.status.${toSalesOrderStatusKey(status.value)}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
              <SelectTrigger className='h-11 w-full sm:w-[180px] rounded-full border-dashed bg-background/80 font-bold shadow-sm'>
                <SelectValue placeholder={t('tradingSalesOrder.master.filters.paymentMethod')} />
              </SelectTrigger>
              <SelectContent className='rounded-2xl'>
                <SelectItem value='ALL'>{t('tradingSalesOrder.master.filters.allPaymentMethods')}</SelectItem>
                {paymentMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentTermFilter} onValueChange={setPaymentTermFilter}>
              <SelectTrigger className='h-11 w-full sm:w-[180px] rounded-full border-dashed bg-background/80 font-bold shadow-sm'>
                <SelectValue placeholder={t('tradingSalesOrder.master.filters.paymentTerm')} />
              </SelectTrigger>
              <SelectContent className='rounded-2xl'>
                <SelectItem value='ALL'>{t('tradingSalesOrder.master.filters.allPaymentTerms')}</SelectItem>
                {paymentTermOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAddOrder}
              className='h-11 w-full px-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/10 sm:w-auto'
            >
              <Plus className='mr-2 size-4' />
              {t('tradingSalesOrder.linesEditor.addLine')}
            </Button>
          </div>
        </div>

        {hasCustomerContext && (
          <div className='flex items-center justify-between rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3'>
            <div className='text-[11px] font-black tracking-wide text-primary'>
              当前客户上下文：{customerContextLabel}
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest'
              onClick={handleClearCustomerContext}
            >
              清除上下文
            </Button>
          </div>
        )}

        <ScrollArea className='flex-1 border-2 border-dashed border-muted/50 rounded-[32px] bg-muted/5'>
          <div className='p-4 space-y-4'>
            <SalesOrderMaster
              orders={primaryOrders}
              selectedId={selectedId || undefined}
              onSelect={handleOpenDetail}
              onEdit={handleEditOrder}
              onDelete={handleDeleteOrder}
            />

            {shouldLoadCanceledSection && canceledOrders.length > 0 && (
              <div className='space-y-3'>
                <div className='flex items-center justify-between rounded-2xl border border-dashed border-rose-200/80 bg-rose-50/50 px-4 py-3'>
                  <div className='text-[11px] font-black tracking-wide text-rose-600'>
                    {t('tradingSalesOrder.status.canceled')} ({canceledTotal})
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest'
                    onClick={() => setShowCanceledSection((prev) => !prev)}
                  >
                    {showCanceledSection ? '收起' : '展开'}
                  </Button>
                </div>

                {showCanceledSection && (
                  <SalesOrderMaster
                    orders={canceledOrders}
                    selectedId={selectedId || undefined}
                    onSelect={handleOpenDetail}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                  />
                )}

                {showCanceledSection && canceledTotal > pageSize && (
                  <div className='mt-2 flex items-center justify-center gap-4'>
                    <Button
                      variant='outline'
                      size='icon'
                      disabled={canceledPage === 1}
                      onClick={() => setCanceledPage((p) => p - 1)}
                      className='size-10 rounded-full'
                    >
                      <ChevronLeft className='size-4' />
                    </Button>
                    <span className='font-mono text-[10px] font-black'>
                      {canceledPage} / {Math.ceil(canceledTotal / pageSize)}
                    </span>
                    <Button
                      variant='outline'
                      size='icon'
                      disabled={canceledPage >= Math.ceil(canceledTotal / pageSize)}
                      onClick={() => setCanceledPage((p) => p + 1)}
                      className='size-10 rounded-full'
                    >
                      <ChevronRight className='size-4' />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {total > pageSize && (
          <div className='mt-2 flex items-center justify-center gap-4'>
            <Button
              variant='outline'
              size='icon'
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className='size-10 rounded-full'
            >
              <ChevronLeft className='size-4' />
            </Button>
            <span className='font-mono text-[10px] font-black'>
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant='outline'
              size='icon'
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className='size-10 rounded-full'
            >
              <ChevronRight className='size-4' />
            </Button>
          </div>
        )}
      </div>

      <SalesOrderDetailSheet
        open={!!selectedId}
        orderId={selectedId}
        order={selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDetail()
          }
        }}
        onDelete={(order) => {
          handleCloseDetail()
          handleDeleteOrderFromDetail(order)
        }}
      />

      <SalesOrderActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        order={editingOrder}
      />
    </div>
  )
}
