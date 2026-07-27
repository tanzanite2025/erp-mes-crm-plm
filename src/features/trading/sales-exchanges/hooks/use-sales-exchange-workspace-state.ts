import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { SalesOrder } from '@/features/trading/data/schema'
import {
  useGetSalesOrderDetail,
  useGetSalesOrders,
} from '@/features/trading/sales'
import { toCreateSalesExchangePayload } from '../services/sales-exchange-service'
import type {
  SalesExchangeLineDraft,
  SalesExchangeSourceOrderCandidate,
  SalesExchangeUnmatchedLabelCode,
} from '../types/sales-exchange-types'
import {
  useGetSalesExchanges,
  useSalesExchangeMutations,
} from './use-sales-exchanges'

const salesExchangeSourceOrderPageSize = 50
const salesExchangeRecordPageSize = 50
const canceledSalesOrderStatus = 'Canceled'
const salesExchangeSourceOrderStatuses = [
  'Draft',
  'Pending',
  'Scheduling',
  'InProgress',
  'Done',
]

type CreateSalesExchangeDraftRecordInput = {
  sourceSalesOrder: SalesOrder
  lineDrafts: SalesExchangeLineDraft[]
  unmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[]
  exchangeDate: string
  expectedReplacementDate: string
  receivedOldItemTrackingNo: string
  replacementTrackingNo: string
  exchangeReason: string
  exchangeRemarks: string
}

function createSalesExchangeSourceOrderCandidate(
  sourceSalesOrder: SalesOrder
): SalesExchangeSourceOrderCandidate {
  const exchangeableLines = (sourceSalesOrder.lines ?? []).filter(
    (salesOrderLine) =>
      typeof salesOrderLine.id === 'number' && salesOrderLine.deliveredQty > 0
  )

  return {
    order: sourceSalesOrder,
    exchangeableLines,
    canCreateSalesExchangeDraft: exchangeableLines.length > 0,
  }
}

export function useSalesExchangeWorkspaceState() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/trading/sales-exchanges' })
  const routeCustomerId = search.customerId || undefined
  const routeCustomerName = search.customerName || undefined
  const sourceSearchTerm = search.search ?? ''
  const sourceStatusFilter =
    search.status === canceledSalesOrderStatus
      ? 'all'
      : (search.status ?? 'all')
  const [sourcePage, setSourcePage] = useState(1)
  const selectedSourceSalesOrderId = search.sourceOrderId || undefined
  const [sourceSalesOrderForCreateDialog, setSourceSalesOrderForCreateDialog] =
    useState<SalesOrder | undefined>(undefined)
  const selectedSalesExchangeDraftRecordId = search.exchangeId || undefined
  const salesExchangeMutations = useSalesExchangeMutations()

  const navigateSalesExchangeSearch = (params: {
    search?: string
    status?: string
    sourceOrderId?: string
    exchangeId?: string
  }) => {
    void navigate({
      to: '/trading/sales-exchanges',
      search: {
        customerId: routeCustomerId,
        customerName: routeCustomerName,
        search: (params.search ?? sourceSearchTerm) || undefined,
        status: params.status ?? sourceStatusFilter,
        sourceOrderId: params.sourceOrderId,
        exchangeId: params.exchangeId,
      },
    })
  }

  const sourceSalesOrderStatuses =
    sourceStatusFilter === 'all'
      ? salesExchangeSourceOrderStatuses
      : [sourceStatusFilter]

  const sourceSalesOrdersQuery = useGetSalesOrders(
    sourcePage,
    salesExchangeSourceOrderPageSize,
    {
      withLines: true,
      status: sourceSalesOrderStatuses,
      customerId: routeCustomerId,
      keyword: sourceSearchTerm,
    }
  )

  const selectedSourceSalesOrderQuery = useGetSalesOrderDetail(
    selectedSourceSalesOrderId || ''
  )

  const salesExchangeRecordsQuery = useGetSalesExchanges({
    page: 1,
    pageSize: salesExchangeRecordPageSize,
    customerId: routeCustomerId,
    status: 'all',
  })

  const createdSalesExchangeDraftRecords = useMemo(
    () => salesExchangeRecordsQuery.data?.items ?? [],
    [salesExchangeRecordsQuery.data?.items]
  )

  const sourceSalesOrderCandidates = useMemo(() => {
    const sourceOrders = (sourceSalesOrdersQuery.data?.items ?? []).filter(
      (order) => order.status !== canceledSalesOrderStatus
    )
    const selectedSourceSalesOrder = selectedSourceSalesOrderQuery.data

    if (
      selectedSourceSalesOrder &&
      selectedSourceSalesOrder.status !== canceledSalesOrderStatus &&
      !sourceOrders.some((order) => order.id === selectedSourceSalesOrder.id)
    ) {
      sourceOrders.unshift(selectedSourceSalesOrder)
    }

    return sourceOrders.map(createSalesExchangeSourceOrderCandidate)
  }, [selectedSourceSalesOrderQuery.data, sourceSalesOrdersQuery.data?.items])

  const selectedSourceSalesOrder = useMemo(
    () =>
      selectedSourceSalesOrderQuery.data?.status === canceledSalesOrderStatus
        ? undefined
        : (selectedSourceSalesOrderQuery.data ??
          sourceSalesOrderCandidates.find(
            (candidate) => candidate.order.id === selectedSourceSalesOrderId
          )?.order),
    [
      selectedSourceSalesOrderId,
      selectedSourceSalesOrderQuery.data,
      sourceSalesOrderCandidates,
    ]
  )

  const selectedSalesExchangeDraftRecord = useMemo(
    () =>
      createdSalesExchangeDraftRecords.find(
        (record) => record.id === selectedSalesExchangeDraftRecordId
      ),
    [createdSalesExchangeDraftRecords, selectedSalesExchangeDraftRecordId]
  )

  const sourceTotalPages = Math.max(
    1,
    Math.ceil(
      (sourceSalesOrdersQuery.data?.total ?? 0) /
        salesExchangeSourceOrderPageSize
    )
  )

  const handleChangeSourceSearchTerm = (nextSearchTerm: string) => {
    setSourcePage(1)
    navigateSalesExchangeSearch({
      search: nextSearchTerm || undefined,
      status: sourceStatusFilter,
      sourceOrderId: undefined,
      exchangeId: selectedSalesExchangeDraftRecordId,
    })
  }

  const handleChangeSourceStatusFilter = (nextStatusFilter: string) => {
    setSourcePage(1)
    navigateSalesExchangeSearch({
      search: sourceSearchTerm || undefined,
      status: nextStatusFilter,
      sourceOrderId: undefined,
      exchangeId: selectedSalesExchangeDraftRecordId,
    })
  }

  const handleSelectSourceSalesOrder = (nextSourceSalesOrderId?: string) => {
    navigateSalesExchangeSearch({
      search: sourceSearchTerm || undefined,
      status: sourceStatusFilter,
      sourceOrderId: nextSourceSalesOrderId,
      exchangeId: selectedSalesExchangeDraftRecordId,
    })
  }

  const handleOpenCreateSalesExchangeDialog = (
    sourceSalesOrder: SalesOrder
  ) => {
    handleSelectSourceSalesOrder(sourceSalesOrder.id)
    setSourceSalesOrderForCreateDialog(sourceSalesOrder)
  }

  const handleCloseCreateSalesExchangeDialog = () => {
    setSourceSalesOrderForCreateDialog(undefined)
  }

  const handleCreateSalesExchangeDraftRecord = async (
    input: CreateSalesExchangeDraftRecordInput
  ) => {
    const response = await salesExchangeMutations.createMutation.mutateAsync({
      salesOrderId: input.sourceSalesOrder.id,
      payload: toCreateSalesExchangePayload({
        lineDrafts: input.lineDrafts,
        unmatchedLabelCodes: input.unmatchedLabelCodes,
        exchangeDate: input.exchangeDate,
        expectedReplacementDate: input.expectedReplacementDate,
        receivedOldItemTrackingNo: input.receivedOldItemTrackingNo,
        replacementTrackingNo: input.replacementTrackingNo,
        exchangeReason: input.exchangeReason,
        exchangeRemarks: input.exchangeRemarks,
      }),
    })
    setSourceSalesOrderForCreateDialog(undefined)
    navigateSalesExchangeSearch({
      search: sourceSearchTerm || undefined,
      status: sourceStatusFilter,
      sourceOrderId: input.sourceSalesOrder.id,
      exchangeId: response.salesExchange.id,
    })
  }

  const handleSelectSalesExchangeDraftRecord = (recordId?: string) => {
    navigateSalesExchangeSearch({
      search: sourceSearchTerm || undefined,
      status: sourceStatusFilter,
      sourceOrderId: selectedSourceSalesOrderId,
      exchangeId: recordId,
    })
  }

  const handleRemoveSalesExchangeDraftRecord = async (recordId: string) => {
    await salesExchangeMutations.deleteMutation.mutateAsync({
      salesExchangeId: recordId,
    })
    if (selectedSalesExchangeDraftRecordId === recordId) {
      navigateSalesExchangeSearch({
        search: sourceSearchTerm || undefined,
        status: sourceStatusFilter,
        sourceOrderId: selectedSourceSalesOrderId,
        exchangeId: undefined,
      })
    }
  }

  return {
    sourceSearchTerm,
    sourceStatusFilter,
    sourcePage,
    sourceTotalPages,
    sourceSalesOrdersQuery,
    salesExchangeRecordsQuery,
    sourceSalesOrderCandidates,
    selectedSourceSalesOrderId,
    selectedSourceSalesOrder,
    sourceSalesOrderForCreateDialog,
    createdSalesExchangeDraftRecords,
    selectedSalesExchangeDraftRecordId,
    selectedSalesExchangeDraftRecord,
    handleChangeSourceSearchTerm,
    handleChangeSourceStatusFilter,
    handleChangeSourcePage: setSourcePage,
    handleSelectSourceSalesOrder,
    handleOpenCreateSalesExchangeDialog,
    handleCloseCreateSalesExchangeDialog,
    handleCreateSalesExchangeDraftRecord,
    handleSelectSalesExchangeDraftRecord,
    handleRemoveSalesExchangeDraftRecord,
    isCreatingSalesExchangeDraftRecord:
      salesExchangeMutations.createMutation.isPending,
    isDeletingSalesExchangeDraftRecord:
      salesExchangeMutations.deleteMutation.isPending,
  }
}
