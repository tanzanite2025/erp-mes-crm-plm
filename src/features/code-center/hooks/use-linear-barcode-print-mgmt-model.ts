import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import {
  executeLinearBarcodePrint,
  executeLinearBarcodePrintJobs,
  type LinearBarcodePrintExecutionResult,
  type LinearBarcodePrintJob,
  type LinearBarcodePrintJobResult,
} from '@/features/code-center/services/linear-barcode-print-executor'
import { clampLinearBarcodePrintQuantity } from '@/features/code-center/services/linear-barcode-print-safety'
import {
  handleBatchPrintCompletionFeedback,
  handlePrintBatchesInvalidateFeedback,
  handleSinglePrintFailureFeedback,
  handleSinglePrintSuccessFeedback,
  hasSuccessfulPrintResultItem,
  resolveLinearBarcodePrintErrorMessage,
} from '@/features/code-center/utils/linear-barcode-print-feedback'
import {
  resolveLinearBarcodePrintLines,
  type LinearBarcodeResolvedPrintLine,
} from '@/features/code-center/utils/linear-barcode-print-resolver'
import {
  buildBatchPrintResult,
  buildFailedResultItem,
  buildSkippedBlockedResultItem,
  buildSkippedPreviewReadyResultItem,
  buildSuccessResultItem,
  resolveBatchPrintResultFilter,
  type BatchPrintResult,
  type BatchPrintResultFilter,
  type BatchPrintResultItem,
} from '@/features/code-center/utils/linear-barcode-print-result-builder'
import { LINEAR_BARCODE_INVENTORY_QUERY_KEY } from '@/features/print-mgmt/query-keys'
import { PrintRecordService } from '@/features/print-mgmt/services/print-record-service'
import { getSalesStatusLabel } from '@/features/trading/data/sales-status'
import type {
  SalesOrder,
  SalesOrderStatus,
} from '@/features/trading/data/schema'
import {
  useGetSalesOrderDetail,
  useGetSalesOrders,
} from '@/features/trading/sales'

export const LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES: readonly SalesOrderStatus[] =
  ['Scheduling']

export function isLinearBarcodePrintableSalesOrder(
  order: Pick<SalesOrder, 'status'> | null | undefined
) {
  return Boolean(
    order &&
    LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES.includes(order.status)
  )
}

function formatSerialRange(execution: LinearBarcodePrintExecutionResult) {
  return execution.startSerialNumber === execution.endSerialNumber
    ? execution.startSerialNumber
    : `${execution.startSerialNumber}-${execution.endSerialNumber}`
}

function formatCodeRange(execution: LinearBarcodePrintExecutionResult) {
  const firstCode = execution.codes[0] || '--'
  const lastCode = execution.codes[execution.codes.length - 1] || firstCode
  return firstCode === lastCode ? firstCode : `${firstCode} ... ${lastCode}`
}

export function useLinearBarcodePrintMgmtModel() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [printQuantityByLine, setPrintQuantityByLine] = useState<
    Record<string, number>
  >({})
  const [printingKeys, setPrintingKeys] = useState<Record<string, boolean>>({})
  const [openedPreviewKeys, setOpenedPreviewKeys] = useState<
    Record<string, boolean>
  >({})
  const [isBatchPrinting, setIsBatchPrinting] = useState(false)
  const [retryingKeys, setRetryingKeys] = useState<Record<string, boolean>>({})
  const [isRetryingFailedOnly, setIsRetryingFailedOnly] = useState(false)
  const [batchPrintResult, setBatchPrintResult] =
    useState<BatchPrintResult | null>(null)
  const [resultFilter, setResultFilter] =
    useState<BatchPrintResultFilter>('all')
  const ordersQuery = useGetSalesOrders(1, 100, {
    enabled: true,
    status: [...LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES],
  })
  const detailQuery = useGetSalesOrderDetail(selectedOrderId)
  const protocolQuery = useQuery({
    queryKey: ['code-center', 'linear-barcode', 'print', 'protocol'],
    queryFn: () => linearBarcodeProtocolService.getConfig(),
  })
  const inventoryQuery = useQuery({
    queryKey: [
      ...LINEAR_BARCODE_INVENTORY_QUERY_KEY,
      selectedOrderId || 'recent',
    ],
    queryFn: () =>
      PrintRecordService.getLinearBarcodeInventory({
        salesOrderId: selectedOrderId || undefined,
        limit: 500,
      }),
  })

  const orderOptions = useMemo(
    () =>
      (ordersQuery.data?.items ?? [])
        .filter(isLinearBarcodePrintableSalesOrder)
        .map((order) => ({
          id: order.id,
          label: `${order.orderNo} · ${order.customerName}`,
        })),
    [ordersQuery.data?.items]
  )

  const selectedOrder = detailQuery.data
  const printableSelectedOrder = isLinearBarcodePrintableSalesOrder(
    selectedOrder
  )
    ? selectedOrder
    : undefined
  const selectedOrderStatusLabel = selectedOrder
    ? getSalesStatusLabel(selectedOrder.status, t)
    : ''
  const resolvedLines = useMemo(
    () =>
      resolveLinearBarcodePrintLines({
        order: printableSelectedOrder,
        protocol: protocolQuery.data,
        t,
      }),
    [printableSelectedOrder, protocolQuery.data, t]
  )

  useEffect(() => {
    setPrintQuantityByLine({})
    setPrintingKeys({})
    setOpenedPreviewKeys({})
    setRetryingKeys({})
    setIsRetryingFailedOnly(false)
    setBatchPrintResult(null)
    setResultFilter('all')
  }, [selectedOrderId])

  const previewLines = useMemo(
    () =>
      resolvedLines.map((line) => {
        const quantity = clampLinearBarcodePrintQuantity(
          printQuantityByLine[line.key] ?? line.orderQuantity
        )
        return {
          ...line,
          quantity,
          printInput: line.printInput
            ? { ...line.printInput, quantity }
            : undefined,
        }
      }),
    [printQuantityByLine, resolvedLines]
  )

  const readyCount = previewLines.filter((line) => line.isReady).length
  const blockedCount = previewLines.length - readyCount
  const printableCount = previewLines.filter(
    (line) => line.isReady && !!line.printInput && !openedPreviewKeys[line.key]
  ).length

  const filteredResultItems = useMemo(() => {
    if (!batchPrintResult) return []
    if (resultFilter === 'all') return batchPrintResult.items
    return batchPrintResult.items.filter((item) => item.status === resultFilter)
  }, [batchPrintResult, resultFilter])

  useEffect(() => {
    if (batchPrintResult) {
      setResultFilter(resolveBatchPrintResultFilter(batchPrintResult.items))
    }
  }, [batchPrintResult])

  const setLinePrintQuantity = (itemKey: string, quantity: number) => {
    setPrintQuantityByLine((prev) => ({
      ...prev,
      [itemKey]: clampLinearBarcodePrintQuantity(quantity),
    }))
  }

  const buildExecutionParams = (line: LinearBarcodeResolvedPrintLine) => {
    if (!line.printInput) return null
    return {
      salesOrderId: line.printInput.salesOrderId,
      salesOrderLineNo: line.printInput.lineNo,
      quantity: line.printInput.quantity,
      barcodeConfig: line.printInput.barcodeConfig,
    }
  }

  const submitPrintLine = async (line: LinearBarcodeResolvedPrintLine) => {
    const params = buildExecutionParams(line)
    if (!params) {
      throw new Error(
        t(
          'codeCenter.linearBarcode.print.sections.result.messages.skippedBlocked'
        )
      )
    }
    return executeLinearBarcodePrint(params)
  }

  const toResultItem = (
    line: LinearBarcodeResolvedPrintLine,
    execution: LinearBarcodePrintExecutionResult | undefined,
    error: unknown
  ) => {
    if (execution) {
      return buildSuccessResultItem(line, formatSerialRange(execution), t)
    }
    return buildFailedResultItem(
      line,
      new Error(resolveLinearBarcodePrintErrorMessage(error, t)),
      t
    )
  }

  const handlePrintLine = async (itemKey: string) => {
    const targetLine = previewLines.find((line) => line.key === itemKey)
    if (!targetLine?.printInput || openedPreviewKeys[itemKey]) return

    setPrintingKeys((prev) => ({ ...prev, [itemKey]: true }))
    try {
      const execution = await submitPrintLine(targetLine)
      setOpenedPreviewKeys((prev) => ({ ...prev, [itemKey]: true }))
      await handleSinglePrintSuccessFeedback({
        queryClient,
        quantity: targetLine.printInput.quantity,
        code: formatCodeRange(execution),
        t,
      })
    } catch (error) {
      await handleSinglePrintFailureFeedback({ queryClient, error, t })
    } finally {
      setPrintingKeys((prev) => {
        const next = { ...prev }
        delete next[itemKey]
        return next
      })
    }
  }

  const handleBatchPrint = async () => {
    if (!selectedOrder) return
    setIsBatchPrinting(true)
    setBatchPrintResult(null)
    setResultFilter('all')

    try {
      const fixedItems = new Map<string, BatchPrintResultItem>()
      const jobs: LinearBarcodePrintJob[] = []
      previewLines.forEach((line) => {
        if (!line.isReady || !line.printInput) {
          fixedItems.set(line.key, buildSkippedBlockedResultItem(line, t))
          return
        }
        if (openedPreviewKeys[line.key]) {
          fixedItems.set(line.key, buildSkippedPreviewReadyResultItem(line, t))
          return
        }
        const params = buildExecutionParams(line)
        if (params) jobs.push({ key: line.key, params })
      })

      let outcomes: LinearBarcodePrintJobResult[]
      try {
        outcomes = await executeLinearBarcodePrintJobs(jobs)
      } catch (error) {
        outcomes = jobs.map((job) => ({ key: job.key, error }))
      }
      const outcomeMap = new Map(
        outcomes.map((outcome) => [outcome.key, outcome])
      )
      const successfulKeys: string[] = []
      const resultItems = previewLines.map((line) => {
        const fixed = fixedItems.get(line.key)
        if (fixed) return fixed
        const outcome = outcomeMap.get(line.key)
        if (outcome?.result) successfulKeys.push(line.key)
        return toResultItem(line, outcome?.result, outcome?.error)
      })

      const successCount = successfulKeys.length
      const failureCount = resultItems.filter(
        (item) => item.status === 'failed'
      ).length
      setBatchPrintResult(
        buildBatchPrintResult({
          items: resultItems,
          totalLines: previewLines.length,
          printableLines: jobs.length,
        })
      )
      if (successfulKeys.length > 0) {
        setOpenedPreviewKeys((prev) => {
          const next = { ...prev }
          successfulKeys.forEach((key) => {
            next[key] = true
          })
          return next
        })
      }
      await handleBatchPrintCompletionFeedback({
        queryClient,
        successCount,
        failureCount,
        t,
      })
    } finally {
      setIsBatchPrinting(false)
    }
  }

  const handleRetryItem = async (itemKey: string) => {
    const targetLine = previewLines.find((line) => line.key === itemKey)
    if (!targetLine?.printInput) return
    setRetryingKeys((prev) => ({ ...prev, [itemKey]: true }))
    try {
      let nextItem: BatchPrintResultItem
      try {
        const execution = await submitPrintLine(targetLine)
        nextItem = toResultItem(targetLine, execution, undefined)
      } catch (error) {
        nextItem = toResultItem(targetLine, undefined, error)
      }
      if (hasSuccessfulPrintResultItem(nextItem)) {
        setOpenedPreviewKeys((prev) => ({ ...prev, [itemKey]: true }))
      }
      setBatchPrintResult((prev) => {
        if (!prev) return prev
        const nextItems = prev.items.map((item) =>
          item.key === itemKey ? nextItem : item
        )
        return buildBatchPrintResult({
          items: nextItems,
          totalLines: previewLines.length,
          printableLines: printableCount,
          previous: prev,
        })
      })
      await handlePrintBatchesInvalidateFeedback({
        queryClient,
      })
    } finally {
      setRetryingKeys((prev) => {
        const next = { ...prev }
        delete next[itemKey]
        return next
      })
    }
  }

  const handleRetryFailedOnly = async () => {
    if (!batchPrintResult) return
    const failedItems = batchPrintResult.items.filter(
      (item) => item.status === 'failed'
    )
    if (failedItems.length === 0) return
    setIsRetryingFailedOnly(true)

    try {
      const jobs = failedItems.flatMap((item) => {
        const line = previewLines.find(
          (candidate) => candidate.key === item.key
        )
        const params = line ? buildExecutionParams(line) : null
        return params ? [{ key: item.key, params }] : []
      })
      let outcomes: LinearBarcodePrintJobResult[]
      try {
        outcomes = await executeLinearBarcodePrintJobs(jobs)
      } catch (error) {
        outcomes = jobs.map((job) => ({ key: job.key, error }))
      }
      const outcomeMap = new Map(
        outcomes.map((outcome) => [outcome.key, outcome])
      )
      const successfulKeys: string[] = []
      const nextItems = batchPrintResult.items.map((item) => {
        if (item.status !== 'failed') return item
        const line = previewLines.find(
          (candidate) => candidate.key === item.key
        )
        const outcome = outcomeMap.get(item.key)
        if (!line || !outcome) return item
        if (outcome.result) successfulKeys.push(item.key)
        return toResultItem(line, outcome.result, outcome.error)
      })
      setBatchPrintResult(
        buildBatchPrintResult({
          items: nextItems,
          totalLines: previewLines.length,
          printableLines: printableCount,
          previous: batchPrintResult,
        })
      )
      if (successfulKeys.length > 0) {
        setOpenedPreviewKeys((prev) => {
          const next = { ...prev }
          successfulKeys.forEach((key) => {
            next[key] = true
          })
          return next
        })
      }
      await handlePrintBatchesInvalidateFeedback({
        queryClient,
      })
    } finally {
      setIsRetryingFailedOnly(false)
    }
  }

  const statusBadgeLabel = !selectedOrderId
    ? t('codeCenter.linearBarcode.print.page.badges.awaitingOrder')
    : blockedCount > 0
      ? t('codeCenter.linearBarcode.print.page.badges.analysisBlocked', {
          count: blockedCount,
        })
      : t('codeCenter.linearBarcode.print.page.badges.analysisReady', {
          count: readyCount,
        })

  return {
    selectedOrderId,
    setSelectedOrderId,
    printingKeys,
    openedPreviewKeys,
    isBatchPrinting,
    retryingKeys,
    isRetryingFailedOnly,
    batchPrintResult,
    filteredResultItems,
    resultFilter,
    setResultFilter,
    ordersQuery,
    detailQuery,
    protocolQuery,
    inventoryQuery,
    orderOptions,
    selectedOrder,
    selectedOrderStatusLabel,
    previewLines,
    readyCount,
    blockedCount,
    printableCount,
    setLinePrintQuantity,
    handlePrintLine,
    handleBatchPrint,
    handleRetryItem,
    handleRetryFailedOnly,
    statusBadgeLabel,
  }
}
