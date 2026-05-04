// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const selectPropsLog: Array<{ value: string; onValueChange: (value: string) => void }> = []

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => {
    selectPropsLog.push({ value, onValueChange })
    return <div data-testid={`select-${value}`}>{children}</div>
  },
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) => <button disabled={disabled}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

import { SalesOrderListToolbar } from './sales-order-list-toolbar'

describe('SalesOrderListToolbar', () => {
  it('forwards search, retry, add, and clear customer context actions', () => {
    selectPropsLog.length = 0
    const onSearchTermChange = vi.fn()
    const onRetryFinanceFilters = vi.fn()
    const onAddOrder = vi.fn()
    const onClearCustomerContext = vi.fn()

    render(
      <SalesOrderListToolbar
        searchTerm='abc'
        onSearchTermChange={onSearchTermChange}
        statusFilter='all'
        onStatusFilterChange={vi.fn()}
        paymentMethodFilter='ALL'
        onPaymentMethodFilterChange={vi.fn()}
        paymentTermFilter='ALL'
        onPaymentTermFilterChange={vi.fn()}
        paymentMethodOptions={[{ value: 'BANK', label: 'Bank' }]}
        paymentTermOptions={[{ value: 'COD', label: 'Cash on delivery' }]}
        financeFilterStatus='error'
        financeFilterErrorMessage='财务筛选加载失败'
        onRetryFinanceFilters={onRetryFinanceFilters}
        onAddOrder={onAddOrder}
        hasCustomerContext
        customerContextLabel='Customer A'
        onClearCustomerContext={onClearCustomerContext}
      />
    )

    fireEvent.change(screen.getByDisplayValue('abc'), { target: { value: 'abcd' } })
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    fireEvent.click(screen.getByRole('button', { name: /tradingSalesOrder.linesEditor.addLine/i }))
    fireEvent.click(screen.getByRole('button', { name: '清除上下文' }))

    expect(onSearchTermChange).toHaveBeenCalledWith('abcd')
    expect(onRetryFinanceFilters).toHaveBeenCalledTimes(1)
    expect(onAddOrder).toHaveBeenCalledTimes(1)
    expect(onClearCustomerContext).toHaveBeenCalledTimes(1)
    expect(screen.getByText('当前客户上下文：Customer A')).toBeTruthy()
  })

  it('forwards select value changes to the three filter callbacks', () => {
    selectPropsLog.length = 0
    const onStatusFilterChange = vi.fn()
    const onPaymentMethodFilterChange = vi.fn()
    const onPaymentTermFilterChange = vi.fn()

    render(
      <SalesOrderListToolbar
        searchTerm=''
        onSearchTermChange={vi.fn()}
        statusFilter='all'
        onStatusFilterChange={onStatusFilterChange}
        paymentMethodFilter='ALL'
        onPaymentMethodFilterChange={onPaymentMethodFilterChange}
        paymentTermFilter='ALL'
        onPaymentTermFilterChange={onPaymentTermFilterChange}
        paymentMethodOptions={[{ value: 'BANK', label: 'Bank' }]}
        paymentTermOptions={[{ value: 'COD', label: 'Cash on delivery' }]}
        financeFilterStatus='ready'
        onRetryFinanceFilters={vi.fn()}
        onAddOrder={vi.fn()}
        hasCustomerContext={false}
        customerContextLabel=''
        onClearCustomerContext={vi.fn()}
      />
    )

    expect(selectPropsLog).toHaveLength(3)
    selectPropsLog[0]?.onValueChange('Pending')
    selectPropsLog[1]?.onValueChange('BANK')
    selectPropsLog[2]?.onValueChange('COD')

    expect(onStatusFilterChange).toHaveBeenCalledWith('Pending')
    expect(onPaymentMethodFilterChange).toHaveBeenCalledWith('BANK')
    expect(onPaymentTermFilterChange).toHaveBeenCalledWith('COD')
  })
})
