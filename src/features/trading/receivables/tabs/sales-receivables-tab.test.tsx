// @vitest-environment jsdom

import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SalesReceivablesTab } from './sales-receivables-tab'

const {
  industrialHeaderMock,
  summaryCardsMock,
  tableCardMock,
  detailDialogMock,
  useGetReceivablesMock,
  useSalesReceivablesPageStateMock,
  routeUseSearchMock,
} = vi.hoisted(() => ({
  industrialHeaderMock: vi.fn(),
  summaryCardsMock: vi.fn(),
  tableCardMock: vi.fn(),
  detailDialogMock: vi.fn(),
  useGetReceivablesMock: vi.fn(),
  useSalesReceivablesPageStateMock: vi.fn(),
  routeUseSearchMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/uds/industrial-header', () => ({
  IndustrialHeader: (props: unknown) => {
    industrialHeaderMock(props)
    return <div data-testid='industrial-header' />
  },
}))

vi.mock('@/routes/_authenticated/trading/receivables', () => ({
  Route: {
    useSearch: routeUseSearchMock,
  },
}))

vi.mock('../components/sales-receivables-summary-cards', () => ({
  SalesReceivablesSummaryCards: (props: unknown) => {
    summaryCardsMock(props)
    return <div data-testid='receivables-summary-cards' />
  },
}))

vi.mock('../components/sales-receivables-table-card', () => ({
  SalesReceivablesTableCard: (props: unknown) => {
    tableCardMock(props)
    return <div data-testid='receivables-table-card' />
  },
}))

vi.mock('../components/sales-receivable-detail-dialog', () => ({
  SalesReceivableDetailDialog: (props: unknown) => {
    detailDialogMock(props)
    return <div data-testid='receivable-detail-dialog' />
  },
}))

vi.mock('../hooks/use-sales-receivables-page-state', () => ({
  useSalesReceivablesPageState: useSalesReceivablesPageStateMock,
}))

vi.mock('../hooks/use-receivables', () => ({
  useGetReceivables: useGetReceivablesMock,
}))

describe('SalesReceivablesTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeUseSearchMock.mockReturnValue({
      sourceType: 'SALES_ORDER',
      sourceRefId: 'so-1',
      autoOpen: true,
    })
    useGetReceivablesMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'receivable-1',
            documentNo: 'AR-001',
            customerName: '华东客户',
            currency: 'CNY',
            orderAmount: 100,
            receivedAmount: 40,
            outstandingAmount: 60,
            dueDate: '2026-04-30',
            agingBucket: 'CURRENT',
            status: 'OPEN',
          },
        ],
        summary: {
          totalReceivable: 60,
          overdueReceivable: 0,
          pendingReceiptCount: 1,
        },
      },
    })
    useSalesReceivablesPageStateMock.mockReturnValue({
      activeReceivableId: 'receivable-1',
      handleSelectReceivable: vi.fn(),
      handleDetailOpenChange: vi.fn(),
    })
  })

  it('composes route search, receivable query, summary cards, table labels and detail dialog from one page model', () => {
    render(<SalesReceivablesTab />)

    expect(useGetReceivablesMock).toHaveBeenCalledWith({
      sourceType: 'SALES_ORDER',
      sourceRefId: 'so-1',
    })
    expect(useSalesReceivablesPageStateMock).toHaveBeenCalledWith({
      sourceType: 'SALES_ORDER',
      sourceRefId: 'so-1',
      autoOpen: true,
      items: [
        expect.objectContaining({
          id: 'receivable-1',
          agingBucket: 'CURRENT',
          status: 'OPEN',
        }),
      ],
    })

    expect(industrialHeaderMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        title: 'trading.receivables.title',
        description: 'trading.receivables.description',
      })
    )
    expect(summaryCardsMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        summary: {
          totalReceivable: 60,
          overdueReceivable: 0,
          pendingReceiptCount: 1,
        },
        totalLabel: 'trading.receivables.summaryTotal',
        overdueLabel: 'trading.receivables.summaryOverdue',
        pendingLabel: 'trading.receivables.summaryPending',
      })
    )
    expect(tableCardMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ id: 'receivable-1', orderAmount: 100 })],
        columnLabels: {
          documentNo: 'trading.receivables.columns.documentNo',
          customerName: 'trading.receivables.columns.customerName',
          orderAmount: 'trading.receivables.columns.orderAmount',
          receivedAmount: 'trading.receivables.columns.receivedAmount',
          outstandingAmount: 'trading.receivables.columns.outstandingAmount',
          dueDate: 'trading.receivables.columns.dueDate',
          agingBucket: 'trading.receivables.columns.agingBucket',
          status: 'trading.receivables.columns.status',
        },
      })
    )
    expect(detailDialogMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        open: true,
        receivableId: 'receivable-1',
      })
    )
  })

  it('keeps summary undefined, items empty, and detail closed when the list query has not returned data', () => {
    routeUseSearchMock.mockReturnValue({})
    useGetReceivablesMock.mockReturnValue({ data: undefined })
    useSalesReceivablesPageStateMock.mockReturnValue({
      activeReceivableId: null,
      handleSelectReceivable: vi.fn(),
      handleDetailOpenChange: vi.fn(),
    })

    render(<SalesReceivablesTab />)

    expect(useGetReceivablesMock).toHaveBeenCalledWith({
      sourceType: undefined,
      sourceRefId: undefined,
    })
    expect(useSalesReceivablesPageStateMock).toHaveBeenCalledWith({
      sourceType: undefined,
      sourceRefId: undefined,
      autoOpen: undefined,
      items: [],
    })
    expect(summaryCardsMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        summary: undefined,
      })
    )
    expect(tableCardMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        items: [],
      })
    )
    expect(detailDialogMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        open: false,
        receivableId: null,
      })
    )
  })
})
