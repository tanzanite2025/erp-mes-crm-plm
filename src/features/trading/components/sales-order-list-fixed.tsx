import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  Loader2,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { isForbiddenError } from '@/lib/error-status'
import { warehouseQueryKeys } from '@/features/warehouse/query-keys'
import { ShipmentTransactionService } from '@/features/warehouse/shipment'
import { useAuthStore } from '@/stores/auth-store'
import { tradingQueryKeys } from '../query-keys'
import { type SalesOrder, type SalesOrderStatus, salesOrderStatuses } from '../data/schema'
import { useTradingFinanceResources } from '../hooks/use-trading-finance-resources'
import { useGetSalesOrders, useSalesOrderMutations } from '../sales'
import { requireTradingCommandActor } from '../utils/command-actor'
import { isSalesOrderPreassembleScanAllowed } from '../utils/sales-order-preassemble'
import { SalesOrderActionDialog } from './sales-order-action-dialog'
import { SalesOrderDetailSheet } from './sales-order-detail-sheet'
import { SalesOrderMaster } from './sales-order-master'
import {
  SalesOrderPreassembleScanDialog,
  type SalesOrderPreassembleConfirmPayload,
} from './sales-order-preassemble-scan-dialog'
import { TradingQueryErrorState } from './trading-query-error-state'

const logger = createLogger('SalesOrderList')

type SalesOrderListResource = CompositeReadResource<{
  primaryOrders: SalesOrder[]
  canceledOrders: SalesOrder[]
  total: number
  canceledTotal: number
}>

const salesOrderStatusLabelKeyMap: Record<SalesOrderStatus, 'draft' | 'pending' | 'scheduling' | 'inProgress' | 'done' | 'canceled'> = {
  Draft: 'draft',
  Pending: 'pending',
  Scheduling: 'scheduling',
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
  const queryClient = useQueryClient()
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
  const [preassembleScanOrder, setPreassembleScanOrder] = useState<SalesOrder | null>(null)
  const [isSubmittingPreassemble, setIsSubmittingPreassemble] = useState(false)
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
    () => (isAllStatusesFilter ? ['Draft', 'Pending', 'Scheduling', 'InProgress', 'Done'] : [statusFilter]),
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

  const listResource = useMemo<SalesOrderListResource>(() => {
    const primaryFailure = resolveQueryFailure({
      data: primaryOrdersQuery.data,
      error: primaryOrdersQuery.error,
      isPending: primaryOrdersQuery.isPending,
      scope: 'SalesOrderList.primaryOrders',
      missingMessage: '[CRITICAL] Sales order list missing after load',
      failureMessage: '[CRITICAL] Sales order list query failed',
    })
    if (primaryFailure) {
      return {
        status: 'error',
        error: primaryFailure.error,
        scope: primaryFailure.scope,
      }
    }

    if (shouldLoadCanceledSection) {
      const canceledFailure = resolveQueryFailure({
        data: canceledOrdersQuery.data,
        error: canceledOrdersQuery.error,
        isPending: canceledOrdersQuery.isPending,
        scope: 'SalesOrderList.canceledOrders',
        missingMessage: '[CRITICAL] Canceled sales order list missing after load',
        failureMessage: '[CRITICAL] Canceled sales order list query failed',
      })
      if (canceledFailure) {
        return {
          status: 'error',
          error: canceledFailure.error,
          scope: canceledFailure.scope,
        }
      }
    }

    if (
      primaryOrdersQuery.isPending ||
      (shouldLoadCanceledSection && canceledOrdersQuery.isPending)
    ) {
      return { status: 'loading' }
    }

    const primaryData = primaryOrdersQuery.data
    if (!primaryData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Sales order list missing after load'),
        scope: 'SalesOrderList.primaryOrders',
      }
    }

    if (shouldLoadCanceledSection) {
      const canceledData = canceledOrdersQuery.data
      if (!canceledData) {
        return {
          status: 'error',
          error: new Error('[CRITICAL] Canceled sales order list missing after load'),
          scope: 'SalesOrderList.canceledOrders',
        }
      }

      return {
        status: 'ready',
        primaryOrders: primaryData.items,
        canceledOrders: canceledData.items,
        total: primaryData.total,
        canceledTotal: canceledData.total,
      }
    }

    return {
      status: 'ready',
      primaryOrders: primaryData.items,
      canceledOrders: [],
      total: primaryData.total,
      canceledTotal: 0,
    }
  }, [
    canceledOrdersQuery.data,
    canceledOrdersQuery.error,
    canceledOrdersQuery.isPending,
    primaryOrdersQuery.data,
    primaryOrdersQuery.error,
    primaryOrdersQuery.isPending,
    shouldLoadCanceledSection,
  ])

  useEffect(() => {
    if (listResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load sales order list resources: ${listResource.scope}`, listResource.error)
    failLoudly(listResource.error, listResource.scope)
  }, [listResource])

  const primaryOrders = useMemo(
    () => (listResource.status === 'ready' ? listResource.primaryOrders : []),
    [listResource]
  )
  const canceledOrders = useMemo(
    () => (listResource.status === 'ready' ? listResource.canceledOrders : []),
    [listResource]
  )
  const allLoadedOrders = useMemo(
    () => (shouldLoadCanceledSection ? [...primaryOrders, ...canceledOrders] : primaryOrders),
    [canceledOrders, primaryOrders, shouldLoadCanceledSection]
  )

  const total = listResource.status === 'ready' ? listResource.total : 0
  const canceledTotal = listResource.status === 'ready' ? listResource.canceledTotal : 0

  const financeResources = useTradingFinanceResources()
  const { paymentMethods, paymentTerms } = financeResources
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
  const financeFilterStatus =
    financeResources.readResource.status === 'error'
      ? 'error'
      : financeResources.readResource.status === 'loading'
        ? 'loading'
        : 'ready'
  const financeFilterErrorMessage =
    financeResources.readResource.status === 'error'
      ? financeResources.readResource.error.message
      : undefined

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

  const handleRetryFinanceFilters = () => {
    void financeResources.retry()
  }

  const handlePreassembleConfirm = (payload: SalesOrderPreassembleConfirmPayload) => {
    runConfirmedAction({
      permission: 'action_inventory_shipment_update',
      onAction: async () => {
        if (isSubmittingPreassemble) return
        setIsSubmittingPreassemble(true)

        try {
          let patchedCount = 0
          await Promise.all(
            payload.entries.map(async (entry) => {
              const delta: DeltaSet = {}

              if (entry.currentSalesOrderId !== payload.orderId) {
                delta.salesOrderId = {
                  o: entry.currentSalesOrderId,
                  n: payload.orderId,
                }
              }
              if (entry.currentSalesOrderLineId !== entry.targetSalesOrderLineId) {
                delta.salesOrderLineId = {
                  o: entry.currentSalesOrderLineId,
                  n: entry.targetSalesOrderLineId,
                }
              }
              if (entry.currentOrderNo !== payload.orderNo) {
                delta.orderNo = {
                  o: entry.currentOrderNo,
                  n: payload.orderNo,
                }
              }

              if (Object.keys(delta).length === 0) {
                return
              }

              await ShipmentTransactionService.patchShipmentDraft(
                entry.shipmentId,
                delta,
                entry.version
              )
              patchedCount += 1
            })
          )

          await Promise.all([
            queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrdersRoot() }),
            queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrderDetail(payload.orderId) }),
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.shipmentHistory() }),
            queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.shipmentDemands() }),
          ])

          toast.success(
            patchedCount > 0
              ? `扫码预装已保存（${patchedCount} 条）`
              : '扫码结果已确认（无绑定变更）'
          )
          setPreassembleScanOrder(null)
        } catch (error) {
          toast.error(error instanceof Error ? error.message : '扫码预装保存失败')
        } finally {
          setIsSubmittingPreassemble(false)
        }
      },
    })
  }

  const handleOpenPreassembleScan = (order: SalesOrder) => {
    if (!isSalesOrderPreassembleScanAllowed(order)) return

    runConfirmedAction({
      permission: 'action_inventory_shipment_update',
      onAction: () => {
        setPreassembleScanOrder(order)
      },
    })
  }

  if (listResource.status === 'loading') {
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

  if (listResource.status === 'error') {
    if (isForbiddenError(listResource.error)) return <ForbiddenState />
    return (
      <TradingQueryErrorState
        title={t('tradingSalesOrder.master.errors.loadFailed')}
        error={listResource.error}
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
              <SelectTrigger
                className='h-11 w-full sm:w-[180px] rounded-full border-dashed bg-background/80 font-bold shadow-sm'
                disabled={financeFilterStatus !== 'ready'}
              >
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
              <SelectTrigger
                className='h-11 w-full sm:w-[180px] rounded-full border-dashed bg-background/80 font-bold shadow-sm'
                disabled={financeFilterStatus !== 'ready'}
              >
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

        {financeFilterStatus !== 'ready' ? (
          <div className='flex items-center justify-end gap-3 px-1 text-right text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
            <span>
              {financeFilterStatus === 'loading'
                ? t('common.actions.loading')
                : financeFilterErrorMessage || '财务筛选加载失败'}
            </span>
            {financeFilterStatus === 'error' ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 rounded-full border-dashed px-3 text-[10px] font-black uppercase tracking-widest'
                onClick={handleRetryFinanceFilters}
              >
                重试
              </Button>
            ) : null}
          </div>
        ) : null}

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
              onPreassembleScan={handleOpenPreassembleScan}
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
                    onPreassembleScan={handleOpenPreassembleScan}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                  />
                )}

                {showCanceledSection && canceledTotal > pageSize && (
                  <CompactPaginationControls
                    className='mt-2'
                    page={canceledPage}
                    totalPages={Math.ceil(canceledTotal / pageSize)}
                    onPageChange={setCanceledPage}
                  />
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {total > pageSize && (
          <CompactPaginationControls
            className='mt-2'
            page={page}
            totalPages={Math.ceil(total / pageSize)}
            onPageChange={setPage}
          />
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

      <SalesOrderPreassembleScanDialog
        open={isSalesOrderPreassembleScanAllowed(preassembleScanOrder)}
        onOpenChange={(open) => {
          if (!open && !isSubmittingPreassemble) {
            setPreassembleScanOrder(null)
          }
        }}
        order={preassembleScanOrder}
        isSubmitting={isSubmittingPreassemble}
        onConfirm={handlePreassembleConfirm}
      />
    </div>
  )
}
