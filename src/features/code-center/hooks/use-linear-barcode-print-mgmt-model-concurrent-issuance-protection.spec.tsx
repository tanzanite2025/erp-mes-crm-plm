// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultLinearBarcodeProtocolConfig } from '@/features/basic-settings/data/linear-barcode-protocol'
import type { ProductCodeLabelPrintExecutionResult } from '@/features/code-center/services/product-code-label-print-executor'
import type { SalesOrder } from '@/features/trading/data/schema'
import { useLinearBarcodePrintMgmtModel } from './use-linear-barcode-print-mgmt-model'

const printExecutors = vi.hoisted(() => ({
  single: vi.fn(),
  batch: vi.fn(),
  invalidateQueries: vi.fn().mockResolvedValue(undefined),
}))
const inventoryState = vi.hoisted(() => ({ unattributedIssuedQuantity: 0 }))
const protocol = createDefaultLinearBarcodeProtocolConfig()

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => printExecutors,
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: queryKey.includes('protocol')
      ? protocol
      : {
          items: [],
          total: 0,
          unattributedIssuedQuantity: inventoryState.unattributedIssuedQuantity,
          orderLineIssuanceSummaries: [
            {
              salesOrderLineId: 101,
              salesOrderLineNo: 1,
              orderQuantity: 200,
              issuedQuantity: 20,
              remainingQuantity: 180,
            },
          ],
        },
  }),
}))
vi.mock('@/features/trading/sales', () => ({
  useGetSalesOrders: () => ({ data: { items: [] } }),
  useGetSalesOrderDetail: (id: string) => ({
    data: id
      ? ({
          id,
          status: 'Pending',
          lines: [
            {
              id: 101,
              lineNo: 1,
              productId: '8bf75715-c08b-4a99-b192-3cb2d6883e21',
              productModel: 'RIM-01',
              modelCodeSnapshot: '01',
              appearanceBarcodeCodeSnapshot: '1',
              holePrefixSnapshot: 'R',
              holeCount: 14,
              qty: 200,
              uom: 'PCS',
            },
          ],
        } as SalesOrder)
      : undefined,
  }),
}))
vi.mock(
  '@/features/code-center/services/product-code-label-print-executor',
  () => ({
    executeProductCodeLabelPrint: printExecutors.single,
    executeProductCodeLabelPrintJobs: printExecutors.batch,
  })
)

function createPendingProductCodePrintExecution() {
  let resolve!: (result: ProductCodeLabelPrintExecutionResult) => void
  const promise = new Promise<ProductCodeLabelPrintExecutionResult>(
    (complete) => {
      resolve = complete
    }
  )
  return { promise, resolve }
}

const successfulExecution = {
  code: '26N10011R140001',
  codes: ['26N10011R140001'],
  startSerialNumber: '0001',
  endSerialNumber: '0001',
} as ProductCodeLabelPrintExecutionResult

beforeEach(() => {
  inventoryState.unattributedIssuedQuantity = 0
  printExecutors.single.mockReset().mockResolvedValue(successfulExecution)
  printExecutors.batch.mockReset().mockResolvedValue([])
})
afterEach(cleanup)

function renderProductCodePrintModelForSelectedOrder() {
  const hook = renderHook(() => useLinearBarcodePrintMgmtModel())
  act(() => hook.result.current.setSelectedOrderId('order-1'))
  expect(hook.result.current.previewLines[0].isReady).toBe(true)
  return hook
}

describe('product code issuance concurrency protection', () => {
  it('defaults to the server-reported remaining order-line quantity', () => {
    const { result } = renderProductCodePrintModelForSelectedOrder()
    expect(result.current.previewLines[0]).toMatchObject({
      orderQuantity: 200,
      issuedQuantity: 20,
      remainingQuantity: 180,
      maxPrintQuantity: 180,
      quantity: 180,
    })
  })

  it('blocks issuance when active legacy codes have no confirmed order line', async () => {
    inventoryState.unattributedIssuedQuantity = 2
    const { result } = renderProductCodePrintModelForSelectedOrder()
    const line = result.current.previewLines[0]

    expect(line.hasUnattributedIssuedInventory).toBe(true)
    expect(line.maxPrintQuantity).toBe(0)
    await act(() => result.current.handlePrintLine(line.key))
    expect(printExecutors.single).not.toHaveBeenCalled()
  })

  it('prevents a second click, batch print, and retry from issuing during a single print', async () => {
    const pending = createPendingProductCodePrintExecution()
    printExecutors.single.mockReturnValueOnce(pending.promise)
    const { result } = renderProductCodePrintModelForSelectedOrder()
    const lineKey = result.current.previewLines[0].key
    let firstPrint!: Promise<void>
    await act(async () => {
      firstPrint = result.current.handlePrintLine(lineKey)
      void result.current.handlePrintLine(lineKey)
      void result.current.handleBatchPrint()
      void result.current.handleRetryItem(lineKey)
    })
    const invocationCounts = {
      single: printExecutors.single.mock.calls.length,
      batch: printExecutors.batch.mock.calls.length,
    }
    await act(async () => {
      pending.resolve(successfulExecution)
      await firstPrint
    })
    expect(invocationCounts).toEqual({ single: 1, batch: 0 })
  })

  it('keeps the order fixed while issuing and permits a new order after completion', async () => {
    const pending = createPendingProductCodePrintExecution()
    printExecutors.single.mockReturnValueOnce(pending.promise)
    const { result } = renderProductCodePrintModelForSelectedOrder()
    let firstPrint!: Promise<void>
    act(() => {
      firstPrint = result.current.handlePrintLine(
        result.current.previewLines[0].key
      )
    })
    act(() => result.current.setSelectedOrderId('order-2'))
    const selectedOrderDuringIssuance = result.current.selectedOrderId
    await act(async () => {
      pending.resolve(successfulExecution)
      await firstPrint
    })
    expect(selectedOrderDuringIssuance).toBe('order-1')
    act(() => result.current.setSelectedOrderId('order-2'))
    expect(result.current.selectedOrderId).toBe('order-2')
    expect(result.current.openedPreviewKeys).toEqual({})
  })

  it('blocks single and duplicate batch submissions while a batch is pending', async () => {
    const pending = createPendingProductCodePrintExecution()
    const { result } = renderProductCodePrintModelForSelectedOrder()
    const lineKey = result.current.previewLines[0].key
    printExecutors.batch.mockReturnValueOnce(
      pending.promise.then((execution) => [{ key: lineKey, result: execution }])
    )
    let batchPrint!: Promise<void>
    await act(async () => {
      batchPrint = result.current.handleBatchPrint()
      void result.current.handlePrintLine(lineKey)
      void result.current.handleBatchPrint()
      result.current.setLinePrintQuantity(lineKey, 100)
    })
    expect(result.current.previewLines[0].quantity).toBe(180)
    expect(printExecutors.single).not.toHaveBeenCalled()
    expect(printExecutors.batch).toHaveBeenCalledTimes(1)
    await act(async () => {
      pending.resolve(successfulExecution)
      await batchPrint
    })
    expect(result.current.openedPreviewKeys[lineKey]).toBe(true)
  })

  it('serializes failed-line retries with every other issuance entry point', async () => {
    const { result } = renderProductCodePrintModelForSelectedOrder()
    const lineKey = result.current.previewLines[0].key
    printExecutors.batch.mockResolvedValueOnce([
      { key: lineKey, error: new Error('QR render failed') },
    ])
    await act(() => result.current.handleBatchPrint())
    expect(result.current.batchPrintResult?.failureCount).toBe(1)

    const pending = createPendingProductCodePrintExecution()
    printExecutors.single.mockReturnValueOnce(pending.promise)
    let retry!: Promise<void>
    await act(async () => {
      retry = result.current.handleRetryItem(lineKey)
      void result.current.handleRetryItem(lineKey)
      void result.current.handleRetryFailedOnly()
      void result.current.handlePrintLine(lineKey)
      void result.current.handleBatchPrint()
    })
    expect(printExecutors.single).toHaveBeenCalledTimes(1)
    expect(printExecutors.batch).toHaveBeenCalledTimes(1)
    await act(async () => {
      pending.resolve(successfulExecution)
      await retry
    })
    expect(result.current.batchPrintResult?.successCount).toBe(1)
    await act(() => result.current.handleRetryItem(lineKey))
    expect(printExecutors.single).toHaveBeenCalledTimes(1)
  })

  it('releases issuance protection after failure so the user can retry', async () => {
    const { result } = renderProductCodePrintModelForSelectedOrder()
    const lineKey = result.current.previewLines[0].key
    printExecutors.single.mockRejectedValueOnce(new Error('QR render failed'))
    await act(() => result.current.handlePrintLine(lineKey))
    expect(result.current.isProductCodeIssuanceInProgress).toBe(false)
    await act(() => result.current.handlePrintLine(lineKey))
    expect(printExecutors.single).toHaveBeenCalledTimes(2)
    expect(result.current.openedPreviewKeys[lineKey]).toBe(true)
  })

  it('does not reissue a failed batch line that later succeeds through the normal single-line button', async () => {
    const { result } = renderProductCodePrintModelForSelectedOrder()
    const lineKey = result.current.previewLines[0].key
    printExecutors.batch.mockResolvedValueOnce([
      { key: lineKey, error: new Error('QR render failed') },
    ])
    await act(() => result.current.handleBatchPrint())
    await act(() => result.current.handlePrintLine(lineKey))
    const resultAfterSinglePrint = result.current.batchPrintResult
    await act(() => result.current.handleRetryFailedOnly())
    expect(printExecutors.batch).toHaveBeenCalledTimes(1)
    expect(printExecutors.single).toHaveBeenCalledTimes(1)
    expect(resultAfterSinglePrint?.successCount).toBe(1)
    expect(resultAfterSinglePrint?.failureCount).toBe(0)
  })
})
