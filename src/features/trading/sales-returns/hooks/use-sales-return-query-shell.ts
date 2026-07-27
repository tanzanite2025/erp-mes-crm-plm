import { useMemo, useState, useEffect } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { isNotFoundError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '@/features/trading/data/schema'
import {
  useGetSalesReturnSourceOrderDetail,
  useGetSalesReturnSourceOrders,
} from '@/features/trading/sales/hooks/use-sales-return-queries'
import {
  useGetSalesReturnDetail,
  useGetSalesReturns,
} from '@/features/trading/sales/hooks/use-sales-returns'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'

const SOURCE_ORDERS_PAGE_SIZE = 50
const SALES_RETURNS_PAGE_SIZE = 20
const SALES_RETURNS_ALL_STATUS = 'all'
const CANCELED_SALES_ORDER_STATUS = 'Canceled'
const logger = createLogger('useSalesReturnQueryShell')

export type SalesReturnSourceOrdersResource = CompositeReadResource<{
  items: SalesOrder[]
  total: number
  totalPages: number
}>

export type SalesReturnRecordsResource = CompositeReadResource<{
  items: SalesReturnRecord[]
  total: number
  totalPages: number
}>

function buildSalesReturnsSearch(params: {
  customerId?: string
  customerName?: string
  search?: string
  status?: string
  sourceOrderId?: string
  returnId?: string
}) {
  return {
    customerId: params.customerId,
    customerName: params.customerName,
    search: params.search,
    status: params.status,
    sourceOrderId: params.sourceOrderId,
    returnId: params.returnId,
  }
}

export function useSalesReturnQueryShell() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/trading/sales-returns' })
  const routeCustomerId = search.customerId || undefined
  const routeCustomerName = search.customerName || undefined
  const selectedSourceOrderId = search.sourceOrderId || undefined
  const selectedReturnId = search.returnId || undefined
  const sourceSearchTerm = search.search || ''
  const sourceStatusFilter =
    search.status === CANCELED_SALES_ORDER_STATUS
      ? SALES_RETURNS_ALL_STATUS
      : search.status || SALES_RETURNS_ALL_STATUS

  const [sourcePage, setSourcePage] = useState(1)
  const [returnPage, setReturnPage] = useState(1)

  const sourceOrdersQuery = useGetSalesReturnSourceOrders({
    page: sourcePage,
    pageSize: SOURCE_ORDERS_PAGE_SIZE,
    status: sourceStatusFilter,
    customerId: routeCustomerId,
    keyword: sourceSearchTerm,
  })
  const sourceOrderDetailQuery = useGetSalesReturnSourceOrderDetail(
    selectedSourceOrderId || ''
  )

  const returnsListQuery = useGetSalesReturns({
    page: returnPage,
    pageSize: SALES_RETURNS_PAGE_SIZE,
    customerId: routeCustomerId,
    status: SALES_RETURNS_ALL_STATUS,
    keyword: '',
  })
  const returnDetailQuery = useGetSalesReturnDetail(selectedReturnId || '')

  const sourceOrdersResource = useMemo<SalesReturnSourceOrdersResource>(() => {
    const failure = resolveQueryFailure({
      data: sourceOrdersQuery.data,
      error: sourceOrdersQuery.error,
      isPending: sourceOrdersQuery.isPending,
      scope: 'useSalesReturnQueryShell.sourceOrders',
      missingMessage:
        '[CRITICAL] Sales return source orders missing after load',
      failureMessage: '[CRITICAL] Sales return source orders query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (sourceOrdersQuery.isPending) {
      return { status: 'loading' }
    }

    const sourceOrdersData = sourceOrdersQuery.data
    if (!sourceOrdersData) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Sales return source orders missing after load'
        ),
        scope: 'useSalesReturnQueryShell.sourceOrders',
      }
    }

    const visibleSourceOrders = sourceOrdersData.items.filter(
      (order) => order.status !== CANCELED_SALES_ORDER_STATUS
    )
    const total =
      visibleSourceOrders.length === sourceOrdersData.items.length
        ? (sourceOrdersData.total ?? 0)
        : visibleSourceOrders.length

    return {
      status: 'ready',
      items: visibleSourceOrders,
      total,
      totalPages: Math.max(1, Math.ceil(total / SOURCE_ORDERS_PAGE_SIZE)),
    }
  }, [
    sourceOrdersQuery.data,
    sourceOrdersQuery.error,
    sourceOrdersQuery.isPending,
  ])

  const returnsResource = useMemo<SalesReturnRecordsResource>(() => {
    const failure = resolveQueryFailure({
      data: returnsListQuery.data,
      error: returnsListQuery.error,
      isPending: returnsListQuery.isPending,
      scope: 'useSalesReturnQueryShell.returns',
      missingMessage: '[CRITICAL] Sales return records missing after load',
      failureMessage: '[CRITICAL] Sales return records query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (returnsListQuery.isPending) {
      return { status: 'loading' }
    }

    const returnsData = returnsListQuery.data
    if (!returnsData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Sales return records missing after load'),
        scope: 'useSalesReturnQueryShell.returns',
      }
    }

    const total = returnsData.total ?? 0

    return {
      status: 'ready',
      items: returnsData.items,
      total,
      totalPages: Math.max(1, Math.ceil(total / SALES_RETURNS_PAGE_SIZE)),
    }
  }, [
    returnsListQuery.data,
    returnsListQuery.error,
    returnsListQuery.isPending,
  ])

  useEffect(() => {
    if (sourceOrdersResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load sales return source orders: ${sourceOrdersResource.scope}`,
      sourceOrdersResource.error
    )
    failLoudly(sourceOrdersResource.error, sourceOrdersResource.scope)
  }, [sourceOrdersResource])

  useEffect(() => {
    if (returnsResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load sales return records: ${returnsResource.scope}`,
      returnsResource.error
    )
    failLoudly(returnsResource.error, returnsResource.scope)
  }, [returnsResource])

  const sourceTotalPages =
    sourceOrdersResource.status === 'ready'
      ? sourceOrdersResource.totalPages
      : 1

  const selectedSourceOrder = useMemo(() => {
    const sourceOrders =
      sourceOrdersResource.status === 'ready' ? sourceOrdersResource.items : []

    if (sourceOrderDetailQuery.data) {
      if (sourceOrderDetailQuery.data.status === CANCELED_SALES_ORDER_STATUS) {
        return undefined
      }

      return sourceOrderDetailQuery.data
    }

    return sourceOrders.find((order) => order.id === selectedSourceOrderId)
  }, [sourceOrderDetailQuery.data, sourceOrdersResource, selectedSourceOrderId])

  const returnTotalPages =
    returnsResource.status === 'ready' ? returnsResource.totalPages : 1

  const hasMissingSelectedReturn =
    Boolean(selectedReturnId) && isNotFoundError(returnDetailQuery.error)

  useEffect(() => {
    if (!hasMissingSelectedReturn || !selectedReturnId) {
      return
    }

    navigate({
      to: '/trading/sales-returns',
      replace: true,
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: sourceSearchTerm || undefined,
        status:
          sourceStatusFilter === SALES_RETURNS_ALL_STATUS
            ? undefined
            : sourceStatusFilter,
        sourceOrderId: selectedSourceOrderId,
        returnId: undefined,
      }),
    })
  }, [
    hasMissingSelectedReturn,
    navigate,
    routeCustomerId,
    routeCustomerName,
    selectedReturnId,
    selectedSourceOrderId,
    sourceSearchTerm,
    sourceStatusFilter,
  ])

  const selectedReturnRecord = useMemo(() => {
    const returnRecords =
      returnsResource.status === 'ready' ? returnsResource.items : []

    if (hasMissingSelectedReturn) {
      return undefined
    }

    if (returnDetailQuery.data) {
      return returnDetailQuery.data
    }

    return returnRecords.find((record) => record.id === selectedReturnId)
  }, [
    hasMissingSelectedReturn,
    returnDetailQuery.data,
    returnsResource,
    selectedReturnId,
  ])

  const handleSourceSearchTermChange = (value: string) => {
    setSourcePage(1)
    navigate({
      to: '/trading/sales-returns',
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: value || undefined,
        status:
          sourceStatusFilter === SALES_RETURNS_ALL_STATUS
            ? undefined
            : sourceStatusFilter,
        sourceOrderId: undefined,
        returnId: selectedReturnId,
      }),
    })
  }

  const handleSourceStatusFilterChange = (value: string) => {
    setSourcePage(1)
    navigate({
      to: '/trading/sales-returns',
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: sourceSearchTerm || undefined,
        status: value === SALES_RETURNS_ALL_STATUS ? undefined : value,
        sourceOrderId: undefined,
        returnId: selectedReturnId,
      }),
    })
  }

  const handleSelectSourceOrder = (id: string) => {
    navigate({
      to: '/trading/sales-returns',
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: sourceSearchTerm || undefined,
        status:
          sourceStatusFilter === SALES_RETURNS_ALL_STATUS
            ? undefined
            : sourceStatusFilter,
        sourceOrderId: id,
        returnId: selectedReturnId,
      }),
    })
  }

  const handleClearSelectedSourceOrder = () => {
    navigate({
      to: '/trading/sales-returns',
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: sourceSearchTerm || undefined,
        status:
          sourceStatusFilter === SALES_RETURNS_ALL_STATUS
            ? undefined
            : sourceStatusFilter,
        sourceOrderId: undefined,
        returnId: selectedReturnId,
      }),
    })
  }

  const handleSelectReturn = (id: string) => {
    navigate({
      to: '/trading/sales-returns',
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: sourceSearchTerm || undefined,
        status:
          sourceStatusFilter === SALES_RETURNS_ALL_STATUS
            ? undefined
            : sourceStatusFilter,
        sourceOrderId: selectedSourceOrderId,
        returnId: id,
      }),
    })
  }

  const handleClearSelectedReturn = () => {
    navigate({
      to: '/trading/sales-returns',
      search: buildSalesReturnsSearch({
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: sourceSearchTerm || undefined,
        status:
          sourceStatusFilter === SALES_RETURNS_ALL_STATUS
            ? undefined
            : sourceStatusFilter,
        sourceOrderId: selectedSourceOrderId,
        returnId: undefined,
      }),
    })
  }

  return {
    customerId: routeCustomerId,
    customerName: routeCustomerName,
    sourceSearchTerm,
    sourceStatusFilter,
    sourcePage,
    sourceTotalPages,
    sourceOrdersResource,
    selectedSourceOrderId,
    selectedSourceOrder,
    refetchSourceOrders: sourceOrdersQuery.refetch,
    isSourceDetailLoading:
      Boolean(selectedSourceOrderId) && sourceOrderDetailQuery.isPending,
    handleSourceSearchTermChange,
    handleSourceStatusFilterChange,
    handleSelectSourceOrder,
    handleClearSelectedSourceOrder,
    handleSourcePageChange: setSourcePage,
    returnPage,
    returnTotalPages,
    returnsResource,
    selectedReturnId,
    selectedReturnRecord,
    refetchReturns: returnsListQuery.refetch,
    isReturnDetailLoading:
      Boolean(selectedReturnId) && returnDetailQuery.isPending,
    handleSelectReturn,
    handleClearSelectedReturn,
    handleReturnPageChange: setReturnPage,
  }
}
