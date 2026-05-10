// @vitest-environment jsdom

import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SalesOrder } from '../data/schema'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('@/lib/audit-utils', () => ({
  auditUtils: {
    formatOperatorName: () => 'SYSTEM',
  },
}))

vi.mock('../utils/sales-order-actions', () => ({
  canRegisterSalesOrderReceipt: () => true,
}))

vi.mock('../utils/sales-order-preassemble', () => ({
  isSalesOrderPreassembleScanAllowed: () => false,
}))

vi.mock('./parts/sales-order-quantity-packaging-cell', () => ({
  SalesOrderQuantitySummaryCard: () => <div data-testid='quantity-summary-card'>quantity</div>,
  SalesOrderQuantityPackagingCell: () => <div data-testid='quantity-summary-card'>quantity</div>,
}))

vi.mock('./parts/sales-order-packaging-entry', () => ({
  SalesOrderPackagingEntry: () => <div data-testid='packaging-entry-card'>packaging</div>,
}))

import { SalesOrderMaster } from './sales-order-master'

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
    fulfillmentRate: 50,
    version: 1,
    ...overrides,
  }
}

describe('SalesOrderMaster detail entry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('does not open detail when clicking ordinary row content', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <SalesOrderMaster
        orders={[buildOrder()]}
        selectedId={undefined}
        onSelect={onSelect}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    await user.click(screen.getByText('SO-001'))

    expect(onSelect).not.toHaveBeenCalled()
  })

  it('opens detail only when clicking the explicit view-detail button', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <SalesOrderMaster
        orders={[buildOrder()]}
        selectedId={undefined}
        onSelect={onSelect}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: 'tradingSalesOrder.master.actions.viewDetail',
      })
    )

    expect(onSelect).toHaveBeenCalledWith('order-1')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders classification and order date as separate info cards', () => {
    render(
      <SalesOrderMaster
        orders={[buildOrder()]}
        selectedId={undefined}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(
      screen.getByText((content) =>
        content.includes('tradingSalesOrder.master.columns.classification:')
      )
    ).toBeTruthy()
    expect(
      screen.getByText((content) =>
        content.includes('tradingSalesOrder.master.columns.orderDate:')
      )
    ).toBeTruthy()
    expect(
      screen.queryByText('tradingSalesOrder.master.columns.classificationDate')
    ).toBeNull()
  })

  it('renders customer and delivery deadline in the header meta area left of view detail', () => {
    render(
      <SalesOrderMaster
        orders={[buildOrder()]}
        selectedId={undefined}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const headerMeta = screen.getByTestId('sales-order-header-secondary-meta-order-1')

    expect(
      within(headerMeta).getByText((content) =>
        content.includes('tradingSalesOrder.master.columns.customer:')
      )
    ).toBeTruthy()
    expect(within(headerMeta).getByText('Customer A')).toBeTruthy()
    expect(
      within(headerMeta).getByText((content) =>
        content.includes('tradingSalesOrder.master.columns.deliveryDeadline:')
      )
    ).toBeTruthy()
    expect(within(headerMeta).getByText('2026-04-30')).toBeTruthy()
  })

  it('renders injected feature cards through the master slot', () => {
    render(
      <SalesOrderMaster
        orders={[buildOrder()]}
        selectedId={undefined}
        onSelect={vi.fn()}
        onPreassembleScan={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        renderFeatureCards={(order) => <div data-testid={`feature-card-${order.id}`}>feature</div>}
      />
    )

    expect(screen.getByTestId('feature-card-order-1')).toBeTruthy()
  })
})
