// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./sales-order-master', () => ({
  SalesOrderMaster: ({ orders }: { orders: SalesOrder[] }) => (
    <div data-testid='canceled-master'>{orders.map((order) => order.id).join(',')}</div>
  ),
}))

vi.mock('@/components/pagination/compact-pagination-controls', () => ({
  CompactPaginationControls: ({ page, onPageChange }: { page: number; onPageChange: (page: number) => void }) => (
    <button type='button' data-testid='canceled-pagination' onClick={() => onPageChange(page + 1)}>
      next-page
    </button>
  ),
}))

import { SalesOrderCanceledSection } from './sales-order-canceled-section'

function buildOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  return {
    id: 'order-c',
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    isDeleted: false,
    orderNo: 'SO-C-001',
    orderName: 'Canceled Order',
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
    status: 'Canceled',
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

describe('SalesOrderCanceledSection', () => {
  it('does not render when canceled section should not load or has no data', () => {
    const { rerender } = render(
      <SalesOrderCanceledSection
        shouldLoadCanceledSection={false}
        canceledOrders={[buildOrder()]}
        canceledTotal={1}
        selectedId={undefined}
        showCanceledSection={false}
        onToggle={vi.fn()}
        pageSize={50}
        canceledPage={1}
        onCanceledPageChange={vi.fn()}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.queryByText(/tradingSalesOrder.status.canceled/i)).toBeNull()

    rerender(
      <SalesOrderCanceledSection
        shouldLoadCanceledSection
        canceledOrders={[]}
        canceledTotal={0}
        selectedId={undefined}
        showCanceledSection={false}
        onToggle={vi.fn()}
        pageSize={50}
        canceledPage={1}
        onCanceledPageChange={vi.fn()}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.queryByText(/tradingSalesOrder.status.canceled/i)).toBeNull()
  })

  it('forwards toggle and renders master plus pagination only when expanded', () => {
    const onToggle = vi.fn()
    const onCanceledPageChange = vi.fn()

    const { rerender } = render(
      <SalesOrderCanceledSection
        shouldLoadCanceledSection
        canceledOrders={[buildOrder()]}
        canceledTotal={51}
        selectedId='order-c'
        showCanceledSection={false}
        onToggle={onToggle}
        pageSize={50}
        canceledPage={1}
        onCanceledPageChange={onCanceledPageChange}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '展开' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('canceled-master')).toBeNull()
    expect(screen.queryByTestId('canceled-pagination')).toBeNull()

    rerender(
      <SalesOrderCanceledSection
        shouldLoadCanceledSection
        canceledOrders={[buildOrder()]}
        canceledTotal={51}
        selectedId='order-c'
        showCanceledSection
        onToggle={onToggle}
        pageSize={50}
        canceledPage={1}
        onCanceledPageChange={onCanceledPageChange}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.getByTestId('canceled-master').textContent).toBe('order-c')
    fireEvent.click(screen.getByTestId('canceled-pagination'))
    expect(onCanceledPageChange).toHaveBeenCalledWith(2)
  })
})
