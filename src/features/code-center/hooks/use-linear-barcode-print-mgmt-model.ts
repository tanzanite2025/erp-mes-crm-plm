import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { linearBarcodeProtocolService } from '@/features/basic-settings/services/linear-barcode-protocol-service'
import { executeLinearBarcodePrint } from '@/features/code-center/services/linear-barcode-print-executor'
import {
  handleBatchPrintCompletionFeedback,
  handlePrintBatchesInvalidateFeedback,
  handleSinglePrintFailureFeedback,
  handleSinglePrintSuccessFeedback,
  hasSuccessfulPrintResultItem,
  hasSuccessfulPrintResultItems,
  resolveIssueNumbersFailureFeedback,
  type LinearBarcodeInlineFeedbackState,
} from '@/features/code-center/utils/linear-barcode-print-feedback'
import {
  buildBatchPrintResult,
  buildFailedResultItem,
  buildSkippedBlockedResultItem,
  buildSkippedUnnumberedResultItem,
  buildSuccessResultItem,
  resolveBatchPrintResultFilter,
  type BatchPrintResult,
  type BatchPrintResultFilter,
  type BatchPrintResultItem,
} from '@/features/code-center/utils/linear-barcode-print-result-builder'
import {
  resolveLinearBarcodePrintLines,
  type LinearBarcodeResolvedPrintLine,
} from '@/features/code-center/utils/linear-barcode-print-resolver'
import type { SalesOrder, SalesOrderStatus } from '@/features/trading/data/schema'
import { getSalesStatusLabel } from '@/features/trading/data/sales-status'
import { useGetSalesOrderDetail, useGetSalesOrders } from '@/features/trading/sales'
import { useLanguage } from '@/context/language-provider'

export const LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES: readonly SalesOrderStatus[] = [
  'Scheduling',
]

export function isLinearBarcodePrintableSalesOrder(
  order: Pick<SalesOrder, 'status'> | null | undefined
) {
  return Boolean(
    order &&
      LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES.includes(order.status)
  )
}

export function useLinearBarcodePrintMgmtModel() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [issuedSerialByLine, setIssuedSerialByLine] = useState<Record<string, string>>({})
  const [printingKeys, setPrintingKeys] = useState<Record<string, boolean>>({})
  const [isIssuingNumbers, setIsIssuingNumbers] = useState(false)
  const [isBatchPrinting, setIsBatchPrinting] = useState(false)
  const [retryingKeys, setRetryingKeys] = useState<Record<string, boolean>>({})
  const [isRetryingFailedOnly, setIsRetryingFailedOnly] = useState(false)
  const [issueFeedback, setIssueFeedback] = useState<LinearBarcodeInlineFeedbackState | null>(null)
  const [batchPrintResult, setBatchPrintResult] = useState<BatchPrintResult | null>(null)
  const [resultFilter, setResultFilter] = useState<BatchPrintResultFilter>('all')
  const ordersQuery = useGetSalesOrders(1, 100, {
    enabled: true,
    status: [...LINEAR_BARCODE_PRINTABLE_SALES_ORDER_STATUSES],
  })
  const detailQuery = useGetSalesOrderDetail(selectedOrderId)
  const protocolQuery = useQuery({
    queryKey: ['code-center', 'linear-barcode', 'print', 'protocol'],
    queryFn: () => linearBarcodeProtocolService.getConfig(),
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
  const printableSelectedOrder = isLinearBarcodePrintableSalesOrder(selectedOrder)
    ? selectedOrder
    : undefined
  const selectedOrderStatusLabel = selectedOrder
    ? getSalesStatusLabel(selectedOrder.status, t)
    : ''
  const resolvedLines = useMemo(() => {
    return resolveLinearBarcodePrintLines({
      order: printableSelectedOrder,
      protocol: protocolQuery.data,
      t,
    })
  }, [printableSelectedOrder, protocolQuery.data, t])

  useEffect(() => {
    setIssuedSerialByLine({})
    setPrintingKeys({})
    setIssueFeedback(null)
    setRetryingKeys({})
    setIsRetryingFailedOnly(false)
    setBatchPrintResult(null)
    setResultFilter('all')
  }, [selectedOrderId])

  const previewLines = useMemo(
    () =>
      resolvedLines.map((line) => {
        const issuedSerial = issuedSerialByLine[line.key]
        if (!issuedSerial || !line.printInput) {
          return line
        }

        return {
          ...line,
          printInput: {
            ...line.printInput,
            mockInputs: {
              ...line.printInput.mockInputs,
              serial: issuedSerial,
            },
            barcodeConfig: {
              ...line.printInput.barcodeConfig,
              serialNumber: issuedSerial,
            },
          },
        }
      }),
    [issuedSerialByLine, resolvedLines]
  )

  const readyCount = previewLines.filter((line) => line.isReady).length
  const blockedCount = previewLines.length - readyCount
  const issuedCount = Object.keys(issuedSerialByLine).length
  const allReadyLinesNumbered = readyCount > 0 && issuedCount >= readyCount
  const printableCount = previewLines.filter(
    (line) => line.isReady && !!line.printInput && Boolean(issuedSerialByLine[line.key])
  ).length

  const filteredResultItems = useMemo(() => {
    if (!batchPrintResult) {
      return []
    }

    if (resultFilter === 'all') {
      return batchPrintResult.items
    }

    return batchPrintResult.items.filter((item) => item.status === resultFilter)
  }, [batchPrintResult, resultFilter])

  useEffect(() => {
    if (!batchPrintResult) {
      return
    }

    setResultFilter(resolveBatchPrintResultFilter(batchPrintResult.items))
  }, [batchPrintResult])

  const buildTemplateName = (line: LinearBarcodeResolvedPrintLine) => {
    if (!selectedOrder) {
      return null
    }

    return `SO-LINEAR-${selectedOrder.orderNo}-L${line.lineNo}`
  }

  const submitPrintLine = async (line: LinearBarcodeResolvedPrintLine) => {
    if (!line.printInput) {
      throw new Error(t('codeCenter.linearBarcode.print.sections.result.messages.skippedBlocked'))
    }

    const templateName = buildTemplateName(line)
    if (!templateName) {
      throw new Error(t('codeCenter.linearBarcode.print.sections.result.messages.skippedBlocked'))
    }

    return executeLinearBarcodePrint({
      productId: line.printInput.productId,
      quantity: line.printInput.quantity,
      templateName,
      barcodeConfig: line.printInput.barcodeConfig,
    })
  }

  const executePrintForLine = async (
    line: LinearBarcodeResolvedPrintLine
  ): Promise<BatchPrintResultItem> => {
    if (!selectedOrder || !line.printInput) {
      return buildSkippedBlockedResultItem(line, t)
    }

    try {
      const execution = await submitPrintLine(line)

      return buildSuccessResultItem(line, execution.serialNumber, t)
    } catch (_error) {
      return buildFailedResultItem(line, _error, t)
    }
  }

  const handleIssueRealNumbers = async () => {
    const readyLines = resolvedLines.filter((line) => line.isReady && line.printInput)
    if (readyLines.length === 0 || allReadyLinesNumbered) {
      return
    }

    setIsIssuingNumbers(true)
    setIssueFeedback(null)

    try {
      const nextIssuedSerials: Record<string, string> = {}
      for (const line of readyLines) {
        if (!line.printInput) {
          continue
        }
        nextIssuedSerials[line.key] = await numberingService.generateNumber(line.printInput.sequenceRuleKey)
      }
      setIssuedSerialByLine(nextIssuedSerials)
    } catch (_error) {
      setIssueFeedback(resolveIssueNumbersFailureFeedback({ t }))
    } finally {
      setIsIssuingNumbers(false)
    }
  }

  const handlePrintLine = async (itemKey: string) => {
    const targetLine = previewLines.find((line) => line.key === itemKey)
    if (!targetLine || !targetLine.printInput || !issuedSerialByLine[itemKey]) {
      return
    }

    setPrintingKeys((prev) => ({
      ...prev,
      [itemKey]: true,
    }))

    try {
      const execution = await submitPrintLine(targetLine)
      await handleSinglePrintSuccessFeedback({
        queryClient,
        quantity: targetLine.printInput.quantity,
        serialNumber: execution.serialNumber,
        t,
      })
    } catch (error) {
      handleSinglePrintFailureFeedback({ error, t })
    } finally {
      setPrintingKeys((prev) => {
        const next = { ...prev }
        delete next[itemKey]
        return next
      })
    }
  }

  const handleBatchPrint = async () => {
    if (!selectedOrder) {
      return
    }

    setIsBatchPrinting(true)
    setBatchPrintResult(null)
    setResultFilter('all')

    let successCount = 0
    let failureCount = 0
    const resultItems: BatchPrintResultItem[] = []

    try {
      for (const line of previewLines) {
        if (!line.isReady || !line.printInput) {
          resultItems.push(buildSkippedBlockedResultItem(line, t))
          continue
        }

        if (!issuedSerialByLine[line.key]) {
          resultItems.push(buildSkippedUnnumberedResultItem(line, t))
          continue
        }

        const resultItem = await executePrintForLine(line)
        resultItems.push(resultItem)
        if (resultItem.status === 'success') {
          successCount += 1
        }
        if (resultItem.status === 'failed') {
          failureCount += 1
        }
      }

      setBatchPrintResult(buildBatchPrintResult({
        items: resultItems,
        totalLines: previewLines.length,
        printableLines: printableCount,
      }))
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
    if (!targetLine || !targetLine.printInput || !issuedSerialByLine[itemKey]) {
      return
    }

    setRetryingKeys((prev) => ({
      ...prev,
      [itemKey]: true,
    }))

    try {
      const nextItem = await executePrintForLine(targetLine)
      setBatchPrintResult((prev) => {
        if (!prev) {
          return prev
        }

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
        hasSuccess: hasSuccessfulPrintResultItem(nextItem),
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
    if (!batchPrintResult) {
      return
    }

    const failedItems = batchPrintResult.items.filter((item) => item.status === 'failed')
    if (failedItems.length === 0) {
      return
    }

    setIsRetryingFailedOnly(true)

    try {
      const failedKeySet = new Set(failedItems.map((item) => item.key))
      const resultItemEntries = await Promise.all(
        failedItems.map(async (item) => {
          const targetLine = previewLines.find((line) => line.key === item.key)
          if (!targetLine || !targetLine.printInput || !issuedSerialByLine[item.key]) {
            return [item.key, item] as const
          }

          const nextItem = await executePrintForLine(targetLine)
          return [item.key, nextItem] as const
        })
      )

      const resultMap = new Map(resultItemEntries)
      const nextItems = batchPrintResult.items.map((item) =>
        failedKeySet.has(item.key) ? (resultMap.get(item.key) ?? item) : item
      )

      setBatchPrintResult(buildBatchPrintResult({
        items: nextItems,
        totalLines: previewLines.length,
        printableLines: printableCount,
        previous: batchPrintResult,
      }))
      await handlePrintBatchesInvalidateFeedback({
        queryClient,
        hasSuccess: hasSuccessfulPrintResultItems(nextItems),
      })
    } finally {
      setIsRetryingFailedOnly(false)
    }
  }

  const statusBadgeLabel = !selectedOrderId
    ? t('codeCenter.linearBarcode.print.page.badges.awaitingOrder')
    : blockedCount > 0
      ? t('codeCenter.linearBarcode.print.page.badges.analysisBlocked', { count: blockedCount })
      : t('codeCenter.linearBarcode.print.page.badges.analysisReady', { count: readyCount })

  return {
    selectedOrderId,
    setSelectedOrderId,
    issuedSerialByLine,
    printingKeys,
    isIssuingNumbers,
    isBatchPrinting,
    retryingKeys,
    isRetryingFailedOnly,
    issueFeedback,
    batchPrintResult,
    filteredResultItems,
    resultFilter,
    setResultFilter,
    ordersQuery,
    detailQuery,
    protocolQuery,
    orderOptions,
    selectedOrder,
    selectedOrderStatusLabel,
    resolvedLines,
    previewLines,
    readyCount,
    blockedCount,
    allReadyLinesNumbered,
    printableCount,
    handleIssueRealNumbers,
    handlePrintLine,
    handleBatchPrint,
    handleRetryItem,
    handleRetryFailedOnly,
    statusBadgeLabel,
  }
}
