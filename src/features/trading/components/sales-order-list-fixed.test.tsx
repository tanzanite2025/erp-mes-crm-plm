// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'

const {
  runConfirmedActionMock,
  navigateMock,
  useSearchMock,
  useAuthStoreMock,
  useGetSalesOrdersMock,
  useSalesOrderMutationsMock,
  useTradingFinanceResourcesMock,
} = vi.hoisted(() => ({
  runConfirmedActionMock: vi.fn(),
  navigateMock: vi.fn(),
  useSearchMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  useGetSalesOrdersMock: vi.fn(),
  useSalesOrderMutationsMock: vi.fn(),
  useTradingFinanceResourcesMock: vi.fn(),
}))

let primaryOrders: SalesOrder[] = []
let canceledOrders: SalesOrder[] = []

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
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

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: useAuthStoreMock,
}))

vi.mock('../hooks/use-trading-finance-resources', () => ({
  useTradingFinanceResources: useTradingFinanceResourcesMock,
}))

vi.mock('../sales', () => ({
  useGetSalesOrders: useGetSalesOrdersMock,
  useSalesOrderMutations: useSalesOrderMutationsMock,
}))

vi.mock('./sales-order-master', () => ({
  SalesOrderMaster: ({ orders, onPreassembleScan }: { orders: SalesOrder[]; onPreassembleScan?: (order: SalesOrder) => void }) => (
    <div>
      {orders.map((order) => (
        <button
          key={order.id}
          type='button'
          data-testid={`open-preassemble-${order.id}`}
          onClick={() => onPreassembleScan?.(order)}
        >
          {`open-preassemble-${order.id}`}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('./sales-order-preassemble-scan-dialog', () => ({
  SalesOrderPreassembleScanDialog: ({ open, order }: { open: boolean; order: SalesOrder | null }) => (
    <div data-testid='preassemble-dialog-state'>{open && order ? order.id : 'closed'}</div>
  ),
}))

vi.mock('./sales-order-detail-sheet', () => ({
  SalesOrderDetailSheet: () => null,
}))

vi.mock('./sales-order-action-dialog', () => ({
  SalesOrderActionDialog: () => null,
}))

vi.mock('./trading-query-error-state', () => ({
  TradingQueryErrorState: () => null,
}))

import { SalesOrderList } from './sales-order-list-fixed'

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

function renderList() {
  const queryClient = createQueryClient()
  return render(<SalesOrderList />, {
    wrapper: createWrapper(queryClient),
  })
}

describe('SalesOrderList preassemble entry boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    primaryOrders = [buildOrder()]
    canceledOrders = []

    useSearchMock.mockReturnValue({
      detailId: undefined,
      customerId: undefined,
      customerName: undefined,
      search: '',
    })
    useAuthStoreMock.mockImplementation((selector: (state: { user: { id: string; accountNo: string } }) => unknown) =>
      selector({
        user: {
          id: 'user-1',
          accountNo: 'ACCOUNT-1',
        },
      })
    )
    useTradingFinanceResourcesMock.mockReturnValue({
      readResource: {
        status: 'ready',
        paymentMethodOptions: [],
        paymentTermOptions: [],
      },
      paymentMethods: [],
      paymentTerms: [],
    })
    useSalesOrderMutationsMock.mockReturnValue({
      deleteMutation: {
        isPending: false,
        mutate: vi.fn(),
      },
      cancelMutation: {
        isPending: false,
        mutate: vi.fn(),
      },
    })
    useGetSalesOrdersMock.mockImplementation(
      (_page: number, _pageSize: number, options?: { status?: string[]; enabled?: boolean }) => {
        const isCanceledQuery = options?.status?.includes('Canceled')
        const items = isCanceledQuery ? canceledOrders : primaryOrders
        const enabled = options?.enabled ?? true
        return {
          data: enabled
            ? {
                items,
                total: items.length,
                page: 1,
                pageSize: 50,
              }
            : undefined,
          isLoading: false,
          isError: false,
          error: null,
          refetch: vi.fn(),
        }
      }
    )
    runConfirmedActionMock.mockImplementation(
      ({ onAction }: { onAction: () => void | Promise<void> }) => onAction()
    )
  })

  afterEach(() => {
    cleanup()
  })

  it('opens preassemble dialog only after permission flow allows the action', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getAllByTestId('open-preassemble-order-1')[0])

    expect(runConfirmedActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        permission: 'action_inventory_shipment_update',
      })
    )
    expect(screen.getByTestId('preassemble-dialog-state').textContent).toBe('order-1')
  })

  it('does not open preassemble dialog when permission flow blocks the action', async () => {
    const user = userEvent.setup()
    runConfirmedActionMock.mockImplementation(() => undefined)
    renderList()

    await user.click(screen.getAllByTestId('open-preassemble-order-1')[0])

    expect(runConfirmedActionMock).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('preassemble-dialog-state').textContent).toBe('closed')
  })

  it('does not enter preassemble flow for done orders', async () => {
    const user = userEvent.setup()
    primaryOrders = [buildOrder({ status: 'Done' })]
    renderList()

    await user.click(screen.getAllByTestId('open-preassemble-order-1')[0])

    expect(runConfirmedActionMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('preassemble-dialog-state').textContent).toBe('closed')
  })
})
