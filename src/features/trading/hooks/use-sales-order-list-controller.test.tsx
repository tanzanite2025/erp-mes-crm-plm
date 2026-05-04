// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'

const {
  navigateMock,
  useSearchMock,
  useAuthStoreMock,
  useGetSalesOrdersMock,
  useSalesOrderMutationsMock,
  useTradingFinanceResourcesMock,
  runConfirmedActionMock,
  preassembleStateMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  useSearchMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  useGetSalesOrdersMock: vi.fn(),
  useSalesOrderMutationsMock: vi.fn(),
  useTradingFinanceResourcesMock: vi.fn(),
  runConfirmedActionMock: vi.fn(),
  preassembleStateMock: {
    preassembleScanOrder: null,
    isSubmittingPreassemble: false,
    handleOpenPreassembleScan: vi.fn(),
    handleClosePreassembleScan: vi.fn(),
    handlePreassembleConfirm: vi.fn(),
    isPreassembleDialogOpen: false,
  },
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearch: useSearchMock,
  }
})

vi.mock('@/hooks/use-protected-action', () => ({
  useConfirmedActionFlow: () => ({
    runConfirmedAction: runConfirmedActionMock,
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: useAuthStoreMock,
}))

vi.mock('../sales', () => ({
  useGetSalesOrders: useGetSalesOrdersMock,
  useSalesOrderMutations: useSalesOrderMutationsMock,
}))

vi.mock('./use-trading-finance-resources', () => ({
  useTradingFinanceResources: useTradingFinanceResourcesMock,
}))

vi.mock('./use-sales-order-preassemble-submit', () => ({
  useSalesOrderPreassembleSubmit: () => preassembleStateMock,
}))

import { useSalesOrderListController } from './use-sales-order-list-controller'

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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('use-sales-order-list-controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useSearchMock.mockReturnValue({
      detailId: undefined,
      customerId: undefined,
      customerName: undefined,
      search: '',
    })
    useAuthStoreMock.mockImplementation(
      (selector: (state: { user: { id: string; accountNo: string } }) => unknown) =>
        selector({
          user: {
            id: 'user-1',
            accountNo: 'ACCOUNT-1',
          },
        })
    )
    useTradingFinanceResourcesMock.mockReturnValue({
      readResource: { status: 'ready' },
      paymentMethods: [{ code: 'BANK', name: 'Bank', status: 'Active' }],
      paymentTerms: [{ code: 'COD', name: 'Cash on delivery', status: 'Active' }],
      retry: vi.fn(),
    })
    useSalesOrderMutationsMock.mockReturnValue({
      deleteMutation: { isPending: false, mutate: vi.fn() },
      cancelMutation: { isPending: false, mutate: vi.fn() },
    })
    useGetSalesOrdersMock.mockImplementation(
      (_page: number, _pageSize: number, options?: { status?: string[]; enabled?: boolean }) => {
        const isCanceledQuery = options?.status?.includes('Canceled')
        const enabled = options?.enabled ?? true
        const items = isCanceledQuery ? [buildOrder({ id: 'order-c', status: 'Canceled' })] : [buildOrder()]
        return {
          data: enabled
            ? { items, total: items.length, page: 1, pageSize: 50 }
            : undefined,
          isPending: false,
          error: null,
          refetch: vi.fn(),
        }
      }
    )
    runConfirmedActionMock.mockImplementation(
      ({ onAction }: { onAction: () => void | Promise<void> }) => onAction()
    )
  })

  it('resets paging when search term changes', () => {
    const { result } = renderHook(() => useSalesOrderListController(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.setPage(3)
      result.current.setCanceledPage(2)
      result.current.setSearchTerm('new keyword')
    })

    expect(result.current.page).toBe(1)
    expect(result.current.canceledPage).toBe(1)
    expect(result.current.searchTerm).toBe('new keyword')
  })

  it('shows canceled section when selected order is canceled', () => {
    useSearchMock.mockReturnValue({
      detailId: 'order-c',
      customerId: undefined,
      customerName: undefined,
      search: '',
    })

    const { result } = renderHook(() => useSalesOrderListController(), {
      wrapper: createWrapper(),
    })

    expect(result.current.showCanceledSection).toBe(true)
    expect(result.current.detailSheetState.open).toBe(true)
    expect(result.current.detailSheetState.orderId).toBe('order-c')
  })

  it('routes add action through permission flow and opens action dialog', () => {
    const { result } = renderHook(() => useSalesOrderListController(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.handleAddOrder()
    })

    expect(runConfirmedActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'action_trading_sales_order_manage',
      })
    )
    expect(result.current.actionDialogState.open).toBe(true)
    expect(result.current.actionDialogState.order).toBeNull()
  })

  it('clears customer context through route search update', () => {
    useSearchMock.mockReturnValue({
      detailId: undefined,
      customerId: 'customer-1',
      customerName: 'Customer A',
      search: '',
    })

    const { result } = renderHook(() => useSalesOrderListController(), {
      wrapper: createWrapper(),
    })

    result.current.handleClearCustomerContext()

    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/trading/sales-orders',
        search: expect.any(Function),
      })
    )
    const lastCall = navigateMock.mock.calls[navigateMock.mock.calls.length - 1]
    const searchUpdater = lastCall?.[0]?.search as (prev: Record<string, unknown>) => Record<string, unknown>
    expect(searchUpdater({ customerId: 'customer-1', customerName: 'Customer A' })).toMatchObject({
      customerId: undefined,
      customerName: undefined,
    })
  })
})
