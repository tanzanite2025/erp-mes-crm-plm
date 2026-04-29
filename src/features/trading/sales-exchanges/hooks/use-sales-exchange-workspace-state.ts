import { useMemo, useState } from 'react'
import { useGetSalesOrders } from '@/features/trading/sales'
import type { SalesOrder } from '@/features/trading/data/schema'
import type {
  SalesExchangeLineDraft,
  SalesExchangeSourceOrderCandidate,
  SalesExchangeUnmatchedLabelCode,
} from '../types/sales-exchange-types'
import { toCreateSalesExchangePayload } from '../services/sales-exchange-service'
import {
  useGetSalesExchanges,
  useSalesExchangeMutations,
} from './use-sales-exchanges'

const salesExchangeSourceOrderPageSize = 50
const salesExchangeRecordPageSize = 50

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
  const [sourceSearchTerm, setSourceSearchTerm] = useState('')
  const [sourceStatusFilter, setSourceStatusFilter] = useState('all')
  const [sourcePage, setSourcePage] = useState(1)
  const [selectedSourceSalesOrderId, setSelectedSourceSalesOrderId] = useState<
    string | undefined
  >(undefined)
  const [sourceSalesOrderForCreateDialog, setSourceSalesOrderForCreateDialog] =
    useState<SalesOrder | undefined>(undefined)
  const [selectedSalesExchangeDraftRecordId, setSelectedSalesExchangeDraftRecordId] =
    useState<string | undefined>(undefined)
  const salesExchangeMutations = useSalesExchangeMutations()

  const sourceSalesOrderStatuses =
    sourceStatusFilter === 'all' ? ['InProgress', 'Done'] : [sourceStatusFilter]

  const sourceSalesOrdersQuery = useGetSalesOrders(
    sourcePage,
    salesExchangeSourceOrderPageSize,
    {
      withLines: true,
      status: sourceSalesOrderStatuses,
      keyword: sourceSearchTerm,
    }
  )

  const salesExchangeRecordsQuery = useGetSalesExchanges({
    page: 1,
    pageSize: salesExchangeRecordPageSize,
    status: 'all',
  })

  const createdSalesExchangeDraftRecords = useMemo(
    () => salesExchangeRecordsQuery.data?.items ?? [],
    [salesExchangeRecordsQuery.data?.items]
  )

  const sourceSalesOrderCandidates = useMemo(
    () =>
      (sourceSalesOrdersQuery.data?.items ?? []).map(
        createSalesExchangeSourceOrderCandidate
      ),
    [sourceSalesOrdersQuery.data?.items]
  )

  const selectedSourceSalesOrder = useMemo(
    () =>
      sourceSalesOrderCandidates.find(
        (candidate) => candidate.order.id === selectedSourceSalesOrderId
      )?.order,
    [selectedSourceSalesOrderId, sourceSalesOrderCandidates]
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
    setSourceSearchTerm(nextSearchTerm)
    setSourcePage(1)
    setSelectedSourceSalesOrderId(undefined)
  }

  const handleChangeSourceStatusFilter = (nextStatusFilter: string) => {
    setSourceStatusFilter(nextStatusFilter)
    setSourcePage(1)
    setSelectedSourceSalesOrderId(undefined)
  }

  const handleOpenCreateSalesExchangeDialog = (sourceSalesOrder: SalesOrder) => {
    setSelectedSourceSalesOrderId(sourceSalesOrder.id)
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
    setSelectedSalesExchangeDraftRecordId(response.salesExchange.id)
    setSourceSalesOrderForCreateDialog(undefined)
  }

  const handleRemoveSalesExchangeDraftRecord = async (recordId: string) => {
    await salesExchangeMutations.deleteMutation.mutateAsync({
      salesExchangeId: recordId,
    })
    setSelectedSalesExchangeDraftRecordId((currentSelectedId) =>
      currentSelectedId === recordId ? undefined : currentSelectedId
    )
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
    handleSelectSourceSalesOrder: setSelectedSourceSalesOrderId,
    handleOpenCreateSalesExchangeDialog,
    handleCloseCreateSalesExchangeDialog,
    handleCreateSalesExchangeDraftRecord,
    handleSelectSalesExchangeDraftRecord: setSelectedSalesExchangeDraftRecordId,
    handleRemoveSalesExchangeDraftRecord,
    isCreatingSalesExchangeDraftRecord:
      salesExchangeMutations.createMutation.isPending,
    isDeletingSalesExchangeDraftRecord:
      salesExchangeMutations.deleteMutation.isPending,
  }
}
