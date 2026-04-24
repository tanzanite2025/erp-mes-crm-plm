// @vitest-environment jsdom

import type { ComponentProps, ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LedgerSearchDialog } from './ledger-search-dialog'

const { useTradingFinanceResourcesMock } = vi.hoisted(() => ({
  useTradingFinanceResourcesMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      switch (key) {
        case 'trading.ledger.statuses.OPEN':
          return '待收'
        case 'trading.ledger.statuses.PARTIAL':
          return '部分收款'
        case 'trading.ledger.statuses.OVERDUE':
          return '已逾期'
        case 'trading.ledger.statuses.SETTLED':
          return '已结清'
        case 'trading.ledger.statuses.CANCELLED':
          return '已取消'
        default:
          return key
      }
    },
  }),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-testid='dialog-root'>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <button type='button'>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? ''}</span>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/radio-group', () => ({
  RadioGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  RadioGroupItem: ({ value }: { value: string }) => <input type='radio' value={value} readOnly />,
}))

vi.mock('../../hooks/use-trading-finance-resources', () => ({
  useTradingFinanceResources: useTradingFinanceResourcesMock,
}))

function renderDialog(overrides?: Partial<ComponentProps<typeof LedgerSearchDialog>>) {
  const onOpenChange = vi.fn()
  const onConfirm = vi.fn()
  const onSearchTermChange = vi.fn()
  const onStatusFilterChange = vi.fn()
  const onCurrencyFilterChange = vi.fn()
  const onOutstandingMinChange = vi.fn()
  const onOutstandingMaxChange = vi.fn()
  const onSortByChange = vi.fn()
  const onSortOrderChange = vi.fn()

  const view = render(
    <LedgerSearchDialog
      open
      title='选择应付台账'
      description='在弹窗内搜索、筛选并确认一条应付台账候选。'
      partnerLabel='供应商'
      outstandingLabel='未付金额'
      selectedLedgerId=''
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
      searchResults={[
        {
          id: 'ledger-1',
          documentNo: 'PO-001',
          partnerName: '示例供应商',
          outstandingAmount: 120,
          status: 'OPEN',
          currency: 'CNY',
        },
      ]}
      isSearching={false}
      searchTerm='PO'
      onSearchTermChange={onSearchTermChange}
      statusFilter=''
      onStatusFilterChange={onStatusFilterChange}
      currencyFilter=''
      onCurrencyFilterChange={onCurrencyFilterChange}
      outstandingMin=''
      onOutstandingMinChange={onOutstandingMinChange}
      outstandingMax=''
      onOutstandingMaxChange={onOutstandingMaxChange}
      sortBy='updated_at'
      onSortByChange={onSortByChange}
      sortOrder='desc'
      onSortOrderChange={onSortOrderChange}
      {...overrides}
    />
  )

  return {
    ...view,
    onOpenChange,
    onConfirm,
  }
}

describe('ledger-search-dialog', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    useTradingFinanceResourcesMock.mockReturnValue({
      currencies: [{ code: 'CNY', status: 'Active' }],
      isLoading: false,
    })
  })

  it('renders filter labels, candidate table, and loading empty-state text from props', () => {
    const { rerender } = renderDialog()

    expect(screen.getByRole('heading', { name: '选择应付台账' })).toBeTruthy()
    expect(screen.getByText('在弹窗内搜索、筛选并确认一条应付台账候选。')).toBeTruthy()
    expect(screen.getByLabelText('搜索台账')).toBeTruthy()
    expect(screen.getByText('状态', { selector: 'label' })).toBeTruthy()
    expect(screen.getByText('币种', { selector: 'label' })).toBeTruthy()
    expect(screen.getByLabelText('未付金额最小值')).toBeTruthy()
    expect(screen.getByLabelText('未付金额最大值')).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '台账编号' })).toBeTruthy()
    expect(screen.getByRole('columnheader', { name: '供应商' })).toBeTruthy()
    expect(screen.getByText('PO-001')).toBeTruthy()
    expect(screen.getByText('示例供应商')).toBeTruthy()
    expect(screen.getAllByText('待收').length).toBeGreaterThan(0)

    rerender(
      <LedgerSearchDialog
        open
        title='选择应付台账'
        description='在弹窗内搜索、筛选并确认一条应付台账候选。'
        partnerLabel='供应商'
        outstandingLabel='未付金额'
        selectedLedgerId=''
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        searchResults={[]}
        isSearching
        searchTerm=''
        onSearchTermChange={vi.fn()}
        statusFilter=''
        onStatusFilterChange={vi.fn()}
        currencyFilter=''
        onCurrencyFilterChange={vi.fn()}
        outstandingMin=''
        onOutstandingMinChange={vi.fn()}
        outstandingMax=''
        onOutstandingMaxChange={vi.fn()}
        sortBy='updated_at'
        onSortByChange={vi.fn()}
        sortOrder='desc'
        onSortOrderChange={vi.fn()}
      />
    )

    expect(screen.getByText('正在搜索台账候选...')).toBeTruthy()
  })

  it('selects a row, confirms the chosen ledger, and closes on cancel', async () => {
    const user = userEvent.setup()
    const { onConfirm, onOpenChange } = renderDialog()

    await user.click(screen.getByText('PO-001'))
    await user.click(screen.getByRole('button', { name: '确认选择' }))
    await user.click(screen.getByRole('button', { name: '取消' }))

    expect(onConfirm).toHaveBeenCalledWith('ledger-1')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
