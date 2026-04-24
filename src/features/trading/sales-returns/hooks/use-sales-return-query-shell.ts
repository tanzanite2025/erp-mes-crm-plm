import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  useGetSalesReturnSourceOrderDetail,
  useGetSalesReturnSourceOrders,
} from '@/features/trading/sales/hooks/use-sales-return-queries'
import {
  useGetSalesReturnDetail,
  useGetSalesReturns,
} from '@/features/trading/sales/hooks/use-sales-returns'

const SOURCE_ORDERS_PAGE_SIZE = 50
const SALES_RETURNS_PAGE_SIZE = 20
const SALES_RETURNS_ALL_STATUS = 'all'

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
  const sourceStatusFilter = search.status || SALES_RETURNS_ALL_STATUS

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

  const sourceOrders = useMemo(
    () => sourceOrdersQuery.data?.items ?? [],
    [sourceOrdersQuery.data?.items]
  )
  const sourceTotal = sourceOrdersQuery.data?.total ?? 0
  const sourceTotalPages = Math.max(
    1,
    Math.ceil(sourceTotal / SOURCE_ORDERS_PAGE_SIZE)
  )

  const selectedSourceOrder = useMemo(() => {
    if (sourceOrderDetailQuery.data) {
      return sourceOrderDetailQuery.data
    }

    return sourceOrders.find((order) => order.id === selectedSourceOrderId)
  }, [sourceOrderDetailQuery.data, sourceOrders, selectedSourceOrderId])

  const returnRecords = useMemo(
    () => returnsListQuery.data?.items ?? [],
    [returnsListQuery.data?.items]
  )
  const returnTotal = returnsListQuery.data?.total ?? 0
  const returnTotalPages = Math.max(
    1,
    Math.ceil(returnTotal / SALES_RETURNS_PAGE_SIZE)
  )

  const selectedReturnRecord = useMemo(() => {
    if (returnDetailQuery.data) {
      return returnDetailQuery.data
    }

    return returnRecords.find((record) => record.id === selectedReturnId)
  }, [returnDetailQuery.data, returnRecords, selectedReturnId])

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
    sourceOrders,
    selectedSourceOrderId,
    selectedSourceOrder,
    isSourceLoading: sourceOrdersQuery.isLoading,
    isSourceError: sourceOrdersQuery.isError,
    sourceError: sourceOrdersQuery.error,
    refetchSourceOrders: sourceOrdersQuery.refetch,
    isSourceDetailLoading:
      Boolean(selectedSourceOrderId) && sourceOrderDetailQuery.isLoading,
    handleSourceSearchTermChange,
    handleSourceStatusFilterChange,
    handleSelectSourceOrder,
    handleClearSelectedSourceOrder,
    handleSourcePageChange: setSourcePage,
    returnPage,
    returnTotalPages,
    returnRecords,
    selectedReturnId,
    selectedReturnRecord,
    isReturnsLoading: returnsListQuery.isLoading,
    isReturnsError: returnsListQuery.isError,
    returnsError: returnsListQuery.error,
    refetchReturns: returnsListQuery.refetch,
    isReturnDetailLoading:
      Boolean(selectedReturnId) && returnDetailQuery.isLoading,
    handleSelectReturn,
    handleClearSelectedReturn,
    handleReturnPageChange: setReturnPage,
  }
}
