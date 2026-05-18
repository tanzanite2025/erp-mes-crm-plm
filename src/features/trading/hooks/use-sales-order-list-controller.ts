import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { useAuthStore } from '@/stores/auth-store'
import { useTradingFinanceResources } from './use-trading-finance-resources'
import { useSalesOrderPreassembleSubmit } from './use-sales-order-preassemble-submit'
import { type SalesOrder, type SalesOrderStatus } from '../data/schema'
import { useGetSalesOrders, useSalesOrderMutations } from '../sales'
import { requireTradingCommandActor } from '../utils/command-actor'

const logger = createLogger('useSalesOrderListController')

type SalesOrderListResource = CompositeReadResource<{
  primaryOrders: SalesOrder[]
  canceledOrders: SalesOrder[]
  total: number
  canceledTotal: number
}>

type SalesOrderListFilterOption = {
  value: string
  label: string
}

type SalesOrderListPagingState = {
  page: number
  canceledPage: number
  customerContextKey: string
}

export function useSalesOrderListController() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/trading/sales-orders' })
  const { runConfirmedAction } = useConfirmedActionFlow()
  const user = useAuthStore((state) => state.user)
  const routeCustomerId = search.customerId || undefined
  const routeCustomerName = search.customerName || undefined
  const selectedId = search.detailId || undefined
  const customerContextKey = `${routeCustomerId || ''}:${routeCustomerName || ''}`

  const [pagingState, setPagingState] = useState<SalesOrderListPagingState>({
    page: 1,
    canceledPage: 1,
    customerContextKey,
  })
  const pageSize = 50
  const [searchTerm, setSearchTerm] = useState(search.search || '')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [paymentTermFilter, setPaymentTermFilter] = useState('ALL')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)
  const [isCanceledSectionExpanded, setIsCanceledSectionExpanded] = useState(false)
  const page = pagingState.customerContextKey === customerContextKey ? pagingState.page : 1
  const canceledPage =
    pagingState.customerContextKey === customerContextKey ? pagingState.canceledPage : 1

  const normalizedSearchTerm = searchTerm.trim()
  const isAllStatusesFilter = statusFilter === 'all'
  const isCanceledOnlyFilter = statusFilter.toLowerCase() === 'canceled'
  const shouldLoadCanceledSection = isAllStatusesFilter
  const hasCustomerContext = Boolean(routeCustomerId || routeCustomerName)
  const customerContextLabel = routeCustomerName?.trim() || routeCustomerId || ''
  const normalizedPaymentMethodFilter = paymentMethodFilter !== 'ALL' ? paymentMethodFilter : undefined
  const normalizedPaymentTermFilter = paymentTermFilter !== 'ALL' ? paymentTermFilter : undefined

  const primaryStatusFilter = useMemo<SalesOrderStatus[]>(
    () =>
      isAllStatusesFilter
        ? ['Draft', 'Pending', 'Scheduling', 'InProgress', 'Done']
        : [statusFilter as SalesOrderStatus],
    [isAllStatusesFilter, statusFilter]
  )

  const primaryOrdersQuery = useGetSalesOrders(page, pageSize, {
    withLines: true,
    customerId: routeCustomerId,
    keyword: normalizedSearchTerm,
    status: primaryStatusFilter,
    paymentMethod: normalizedPaymentMethodFilter,
    paymentTerm: normalizedPaymentTermFilter,
    placeholderData: (previousData) => previousData,
  })
  const canceledOrdersQuery = useGetSalesOrders(canceledPage, pageSize, {
    withLines: true,
    customerId: routeCustomerId,
    keyword: normalizedSearchTerm,
    status: ['Canceled'],
    paymentMethod: normalizedPaymentMethodFilter,
    paymentTerm: normalizedPaymentTermFilter,
    enabled: shouldLoadCanceledSection,
    placeholderData: (previousData) => previousData,
  })

  const listResource = useMemo<SalesOrderListResource>(() => {
    const isPrimaryBlockingLoad = primaryOrdersQuery.isPending && !primaryOrdersQuery.data
    const isCanceledBlockingLoad =
      shouldLoadCanceledSection && canceledOrdersQuery.isPending && !canceledOrdersQuery.data
    const primaryFailure = resolveQueryFailure({
      data: primaryOrdersQuery.data,
      error: primaryOrdersQuery.error,
      isPending: isPrimaryBlockingLoad,
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
        isPending: isCanceledBlockingLoad,
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

    if (isPrimaryBlockingLoad || isCanceledBlockingLoad) {
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
  const paymentMethodOptions = useMemo<SalesOrderListFilterOption[]>(
    () =>
      paymentMethods
        .map((item) => ({
          value: item.code,
          label: item.name || item.code,
        }))
        .filter((option) => option.value.trim().length > 0)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [paymentMethods]
  )
  const paymentTermOptions = useMemo<SalesOrderListFilterOption[]>(
    () =>
      paymentTerms
        .map((item) => ({
          value: item.code,
          label: item.name || item.code,
        }))
        .filter((option) => option.value.trim().length > 0)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [paymentTerms]
  )
  const selectedOrder = useMemo(
    () => allLoadedOrders.find((order) => order.id === selectedId),
    [allLoadedOrders, selectedId]
  )
  const financeFilterStatus: 'error' | 'loading' | 'ready' =
    financeResources.readResource.status === 'error'
      ? 'error'
      : financeResources.readResource.status === 'loading'
        ? 'loading'
        : 'ready'
  const financeFilterErrorMessage =
    financeResources.readResource.status === 'error'
      ? financeResources.readResource.error.message
      : undefined
  const isRefreshingList =
    primaryOrdersQuery.isFetching ||
    (shouldLoadCanceledSection && canceledOrdersQuery.isFetching)
  const showCanceledSection =
    shouldLoadCanceledSection &&
    (isCanceledOnlyFilter || selectedOrder?.status === 'Canceled' || isCanceledSectionExpanded)

  const { deleteMutation, cancelMutation } = useSalesOrderMutations()

  const resetPaging = () => {
    setPagingState({
      page: 1,
      canceledPage: 1,
      customerContextKey,
    })
  }

  const handlePageChange = (nextPage: number) => {
    setPagingState((previous) => ({
      page: nextPage,
      canceledPage:
        previous.customerContextKey === customerContextKey ? previous.canceledPage : 1,
      customerContextKey,
    }))
  }

  const handleCanceledPageChange = (nextPage: number) => {
    setPagingState((previous) => ({
      page: previous.customerContextKey === customerContextKey ? previous.page : 1,
      canceledPage: nextPage,
      customerContextKey,
    }))
  }

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value)
    resetPaging()
  }

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    resetPaging()
  }

  const handlePaymentMethodFilterChange = (value: string) => {
    setPaymentMethodFilter(value)
    resetPaging()
  }

  const handlePaymentTermFilterChange = (value: string) => {
    setPaymentTermFilter(value)
    resetPaging()
  }

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
          'useSalesOrderListController.handleDeleteOrder'
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
          'useSalesOrderListController.handleDeleteOrderFromDetail'
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
    resetPaging()
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

  const handleToggleCanceledSection = () => {
    setIsCanceledSectionExpanded((previous) => !previous)
  }

  const preassemble = useSalesOrderPreassembleSubmit()
  const detailSheetState = {
    open: !!selectedId,
    orderId: selectedId,
    order: selectedOrder,
    onOpenChange: (open: boolean) => {
      if (!open) {
        handleCloseDetail()
      }
    },
    onDelete: (order: SalesOrder) => {
      handleCloseDetail()
      handleDeleteOrderFromDetail(order)
    },
  }
  const actionDialogState = {
    open: isActionDialogOpen,
    onOpenChange: setIsActionDialogOpen,
    order: editingOrder,
  }
  const preassembleDialogState = {
    open: preassemble.isPreassembleDialogOpen,
    onOpenChange: (open: boolean) => {
      if (!open) {
        preassemble.handleClosePreassembleScan()
      }
    },
    order: preassemble.preassembleScanOrder,
    isSubmitting: preassemble.isSubmittingPreassemble,
    onConfirm: preassemble.handlePreassembleConfirm,
  }

  return {
    listResource,
    page,
    setPage: handlePageChange,
    canceledPage,
    setCanceledPage: handleCanceledPageChange,
    pageSize,
    total,
    canceledTotal,
    isRefreshingList,
    searchTerm,
    setSearchTerm: handleSearchTermChange,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    paymentMethodFilter,
    setPaymentMethodFilter: handlePaymentMethodFilterChange,
    paymentTermFilter,
    setPaymentTermFilter: handlePaymentTermFilterChange,
    isActionDialogOpen,
    setIsActionDialogOpen,
    editingOrder,
    selectedId,
    selectedOrder,
    primaryOrders,
    canceledOrders,
    shouldLoadCanceledSection,
    showCanceledSection,
    handleToggleCanceledSection,
    hasCustomerContext,
    customerContextLabel,
    paymentMethodOptions,
    paymentTermOptions,
    financeFilterStatus,
    financeFilterErrorMessage,
    handleRetryFinanceFilters,
    handleAddOrder,
    handleEditOrder,
    handleDeleteOrder,
    handleDeleteOrderFromDetail,
    handleOpenDetail,
    handleCloseDetail,
    handleClearCustomerContext,
    handleRetry,
    preassemble,
    detailSheetState,
    actionDialogState,
    preassembleDialogState,
  }
}
