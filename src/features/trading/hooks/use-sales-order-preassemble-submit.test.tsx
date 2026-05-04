// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'
import type { SalesOrderPreassembleConfirmPayload } from '../components/sales-order-preassemble-scan-dialog'

const {
  runConfirmedActionMock,
  patchShipmentDraftMock,
  toastSuccessMock,
  toastErrorMock,
  isSalesOrderPreassembleScanAllowedMock,
} = vi.hoisted(() => ({
  runConfirmedActionMock: vi.fn(),
  patchShipmentDraftMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  isSalesOrderPreassembleScanAllowedMock: vi.fn(),
}))

vi.mock('@/hooks/use-protected-action', () => ({
  useConfirmedActionFlow: () => ({
    runConfirmedAction: runConfirmedActionMock,
  }),
}))

vi.mock('@/features/warehouse/shipment', () => ({
  ShipmentTransactionService: {
    patchShipmentDraft: patchShipmentDraftMock,
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('../utils/sales-order-preassemble', () => ({
  isSalesOrderPreassembleScanAllowed: isSalesOrderPreassembleScanAllowedMock,
}))

import { tradingQueryKeys } from '../query-keys'
import { useSalesOrderPreassembleSubmit } from './use-sales-order-preassemble-submit'
import { warehouseQueryKeys } from '@/features/warehouse/query-keys'

function buildOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  return {
    id: 'order-1',
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    isDeleted: false,
    orderNo: 'SO-001',
    orderName: 'Sales Order 001',
    customerName: 'Customer A',
    customerId: 'customer-1',
    type: 'STANDARD',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    paymentMethod: 'BANK',
    paymentMethodName: 'Bank',
    paymentTerm: 'COD',
    paymentTermName: 'Cash on delivery',
    classification: 'NORMAL',
    status: 'Pending',
    evidences: [],
    amount: 100,
    quantity: 10,
    orderDate: '2026-04-25',
    deliveryDate: '2026-04-30',
    purchaseOrderNo: 'PO-001',
    barcode: 'BC-001',
    requirements: '',
    lines: [],
    version: 1,
    ...overrides,
  }
}

function buildPayload(overrides: Partial<SalesOrderPreassembleConfirmPayload> = {}): SalesOrderPreassembleConfirmPayload {
  return {
    orderId: 'order-1',
    orderNo: 'SO-001',
    entries: [
      {
        shipmentId: 'shipment-1',
        version: 3,
        primaryCode: 'CODE-001',
        materialCode: 'FG-001',
        materialName: '成品A',
        targetSalesOrderLineId: 10,
        currentSalesOrderId: 'order-old',
        currentSalesOrderLineId: 2,
        currentOrderNo: 'SO-OLD',
      },
    ],
    ...overrides,
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('use-sales-order-preassemble-submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runConfirmedActionMock.mockImplementation(
      ({ onAction }: { onAction: () => void | Promise<void> }) => onAction()
    )
    patchShipmentDraftMock.mockResolvedValue(undefined)
    isSalesOrderPreassembleScanAllowedMock.mockImplementation(
      (order: SalesOrder | null | undefined) => {
        if (!order) {
          return false
        }
        return order.status !== 'Done'
      }
    )
  })

  it('opens and closes preassemble dialog only through the permission flow', () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPreassembleSubmit(), {
      wrapper: createWrapper(queryClient),
    })
    const order = buildOrder()

    act(() => {
      result.current.handleOpenPreassembleScan(order)
    })

    expect(runConfirmedActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'action_inventory_shipment_update',
      })
    )
    expect(result.current.preassembleScanOrder?.id).toBe('order-1')
    expect(result.current.isPreassembleDialogOpen).toBe(true)

    act(() => {
      result.current.handleClosePreassembleScan()
    })

    expect(result.current.preassembleScanOrder).toBeNull()
    expect(result.current.isPreassembleDialogOpen).toBe(false)
  })

  it('blocks opening when permission flow blocks or order is not preassemble-eligible', () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useSalesOrderPreassembleSubmit(), {
      wrapper: createWrapper(queryClient),
    })

    runConfirmedActionMock.mockImplementation(() => undefined)
    act(() => {
      result.current.handleOpenPreassembleScan(buildOrder())
    })
    expect(runConfirmedActionMock).toHaveBeenCalledTimes(1)
    expect(result.current.preassembleScanOrder).toBeNull()

    runConfirmedActionMock.mockClear()
    act(() => {
      result.current.handleOpenPreassembleScan(buildOrder({ status: 'Done' }))
    })
    expect(runConfirmedActionMock).not.toHaveBeenCalled()
    expect(result.current.preassembleScanOrder).toBeNull()
  })

  it('patches changed shipment bindings, blocks close while submitting, and invalidates cross-domain queries on success', async () => {
    const queryClient = createQueryClient()
    const invalidateQueriesMock = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    let resolvePatch: (() => void) | null = null
    patchShipmentDraftMock.mockImplementation(
      () => new Promise<void>((resolve) => {
        resolvePatch = resolve
      })
    )

    const { result } = renderHook(() => useSalesOrderPreassembleSubmit(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.handleOpenPreassembleScan(buildOrder())
    })

    act(() => {
      result.current.handlePreassembleConfirm(buildPayload())
    })

    await waitFor(() => {
      expect(result.current.isSubmittingPreassemble).toBe(true)
    })

    act(() => {
      result.current.handleClosePreassembleScan()
    })
    expect(result.current.preassembleScanOrder?.id).toBe('order-1')

    await act(async () => {
      resolvePatch?.()
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(patchShipmentDraftMock).toHaveBeenCalledWith(
        'shipment-1',
        {
          salesOrderId: { o: 'order-old', n: 'order-1' },
          salesOrderLineId: { o: 2, n: 10 },
          orderNo: { o: 'SO-OLD', n: 'SO-001' },
        },
        3
      )
      expect(invalidateQueriesMock).toHaveBeenCalledTimes(4)
    })

    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(1, {
      queryKey: tradingQueryKeys.salesOrdersRoot(),
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(2, {
      queryKey: tradingQueryKeys.salesOrderDetail('order-1'),
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(3, {
      queryKey: warehouseQueryKeys.shipmentHistory(),
    })
    expect(invalidateQueriesMock).toHaveBeenNthCalledWith(4, {
      queryKey: warehouseQueryKeys.shipmentDemands(),
    })
    expect(toastSuccessMock).toHaveBeenCalledWith('扫码预装已保存（1 条）')
    expect(result.current.preassembleScanOrder).toBeNull()
    expect(result.current.isSubmittingPreassemble).toBe(false)
  })

  it('skips patching when entries produce no delta but still invalidates and reports no binding changes', async () => {
    const queryClient = createQueryClient()
    const invalidateQueriesMock = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined)
    const { result } = renderHook(() => useSalesOrderPreassembleSubmit(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.handleOpenPreassembleScan(buildOrder())
    })

    await act(async () => {
      result.current.handlePreassembleConfirm(
        buildPayload({
          entries: [
            {
              shipmentId: 'shipment-1',
              version: 3,
              primaryCode: 'CODE-001',
              materialCode: 'FG-001',
              materialName: '成品A',
              targetSalesOrderLineId: 10,
              currentSalesOrderId: 'order-1',
              currentSalesOrderLineId: 10,
              currentOrderNo: 'SO-001',
            },
          ],
        })
      )
      await Promise.resolve()
    })

    expect(patchShipmentDraftMock).not.toHaveBeenCalled()
    expect(invalidateQueriesMock).toHaveBeenCalledTimes(4)
    expect(toastSuccessMock).toHaveBeenCalledWith('扫码结果已确认（无绑定变更）')
    expect(result.current.preassembleScanOrder).toBeNull()
    expect(result.current.isSubmittingPreassemble).toBe(false)
  })

  it('reports errors and restores submitting state when patching fails', async () => {
    const queryClient = createQueryClient()
    patchShipmentDraftMock.mockRejectedValue(new Error('patch failed'))
    const { result } = renderHook(() => useSalesOrderPreassembleSubmit(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.handleOpenPreassembleScan(buildOrder())
    })

    await act(async () => {
      result.current.handlePreassembleConfirm(buildPayload())
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('patch failed')
    })
    expect(result.current.preassembleScanOrder?.id).toBe('order-1')
    expect(result.current.isSubmittingPreassemble).toBe(false)
  })
})
