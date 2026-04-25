// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'

const {
  navigateMock,
  useSearchMock,
  useGetSalesReturnSourceOrdersMock,
  useGetSalesReturnSourceOrderDetailMock,
  useGetSalesReturnsMock,
  useGetSalesReturnDetailMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useSearchMock: vi.fn(),
  useGetSalesReturnSourceOrdersMock: vi.fn(),
  useGetSalesReturnSourceOrderDetailMock: vi.fn(),
  useGetSalesReturnsMock: vi.fn(),
  useGetSalesReturnDetailMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useSearch: useSearchMock,
}))

vi.mock('@/features/trading/sales/hooks/use-sales-return-queries', () => ({
  useGetSalesReturnSourceOrders: useGetSalesReturnSourceOrdersMock,
  useGetSalesReturnSourceOrderDetail: useGetSalesReturnSourceOrderDetailMock,
}))

vi.mock('@/features/trading/sales/hooks/use-sales-returns', () => ({
  useGetSalesReturns: useGetSalesReturnsMock,
  useGetSalesReturnDetail: useGetSalesReturnDetailMock,
}))

import { useSalesReturnQueryShell } from './use-sales-return-query-shell'

function buildSalesReturnRecord(
  overrides: Partial<SalesReturnRecord> = {}
): SalesReturnRecord {
  return {
    id: 'sr-1',
    returnNo: 'SR-001',
    salesOrderId: 'so-1',
    salesOrderNo: 'SO-001',
    customerId: 'cust-1',
    customerName: 'Customer A',
    status: 'Created',
    trackingNo: '',
    carrier: '',
    shippedAt: undefined,
    trackingFilledAt: undefined,
    trackingFilledBy: '',
    logisticsNote: '',
    pendingTrackingFill: false,
    returnDate: '2026-04-25T00:00:00.000Z',
    issueCategory: 'Damage',
    reason: 'damaged',
    remarks: '',
    actualReturnAmount: 0,
    actualReturnAmountNote: '',
    actualReturnAmountEvidences: [],
    actualReturnAmountRecordedAt: undefined,
    actualReturnAmountRecordedBy: '',
    evidences: [],
    operator: 'tester',
    totalQuantity: 1,
    totalAmount: 12.5,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    lines: [],
    ...overrides,
  }
}

describe('useSalesReturnQueryShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockResolvedValue(undefined)
    useSearchMock.mockReturnValue({
      customerId: 'cust-1',
      customerName: 'Customer A',
      search: 'batch',
      status: 'Created',
      sourceOrderId: 'so-1',
      returnId: 'sr-missing',
    })
    useGetSalesReturnSourceOrdersMock.mockReturnValue({
      data: {
        items: [],
        total: 0,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: vi.fn(),
    })
    useGetSalesReturnSourceOrderDetailMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    })
    useGetSalesReturnsMock.mockReturnValue({
      data: {
        items: [buildSalesReturnRecord({ id: 'sr-missing', returnNo: 'SR-MISSING' })],
        total: 1,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: vi.fn(),
    })
  })

  it('clears the stale returnId when the selected sales return detail returns 404', async () => {
    useGetSalesReturnDetailMock.mockReturnValue({
      data: undefined,
      error: { status: 404 },
      isLoading: false,
    })

    const { result } = renderHook(() => useSalesReturnQueryShell())

    expect(result.current.selectedReturnRecord).toBeUndefined()
    expect(result.current.isReturnDetailLoading).toBe(false)

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/trading/sales-returns',
        replace: true,
        search: {
          customerId: 'cust-1',
          customerName: 'Customer A',
          search: 'batch',
          status: 'Created',
          sourceOrderId: 'so-1',
          returnId: undefined,
        },
      })
    })
  })

  it('does not clear the selection for non-404 detail errors', () => {
    const fallbackRecord = buildSalesReturnRecord({
      id: 'sr-missing',
      returnNo: 'SR-MISSING',
    })

    useGetSalesReturnsMock.mockReturnValue({
      data: {
        items: [fallbackRecord],
        total: 1,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: vi.fn(),
    })
    useGetSalesReturnDetailMock.mockReturnValue({
      data: undefined,
      error: { status: 500 },
      isLoading: false,
    })

    const { result } = renderHook(() => useSalesReturnQueryShell())

    expect(result.current.selectedReturnRecord).toEqual(fallbackRecord)
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
