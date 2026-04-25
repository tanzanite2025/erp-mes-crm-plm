// @vitest-environment jsdom

import type { ReactElement } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { SalesReturnRecordMaster } from './sales-return-record-master'
import { SalesReturnRecordSpotlight } from './sales-return-record-spotlight'

vi.mock(
  './sales-order-sales-return-actual-amount-entry-dialog/sales-order-sales-return-actual-amount-entry-dialog',
  () => ({
    SalesOrderSalesReturnActualAmountEntryDialog: () => null,
  })
)

vi.mock('./sales-return-actual-amount-records/sales-return-actual-amount-summary-card', () => ({
  SalesReturnActualAmountSummaryCard: () => <div data-testid='sales-return-amount-summary' />,
}))

vi.mock(
  './sales-return-actual-amount-records/sales-return-actual-amount-record-history-section',
  () => ({
    SalesReturnActualAmountRecordHistorySection: () => (
      <div data-testid='sales-return-amount-history' />
    ),
  })
)

vi.mock('./sales-return-logistics-panel', () => ({
  SalesReturnLogisticsPanel: () => <div data-testid='sales-return-logistics-panel' />,
}))

vi.mock('./sales-return-create-sheet', () => ({
  SalesReturnCreateSheet: () => null,
}))

function renderWithLanguage(ui: ReactElement) {
  return render(<LanguageProvider defaultLocale='zh-CN'>{ui}</LanguageProvider>)
}

afterEach(() => {
  cleanup()
})

function buildRecord(overrides: Partial<SalesReturnRecord> = {}): SalesReturnRecord {
  return {
    id: 'sr-1',
    returnNo: 'SR-001',
    salesOrderId: 'so-1',
    salesOrderNo: 'SO-001',
    customerId: 'cust-1',
    customerName: '客户A',
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
    reason: '表面异常',
    remarks: '',
    actualReturnAmount: 0,
    actualReturnAmountNote: '',
    actualReturnAmountEvidences: [],
    actualReturnAmountRecordedAt: undefined,
    actualReturnAmountRecordedBy: '',
    evidences: [],
    operator: 'tester',
    totalQuantity: 2,
    totalAmount: 25,
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    lines: [],
    ...overrides,
  }
}

describe('sales return card semantics', () => {
  it('shows delete action only on the left real-return card when delete callback is provided', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const record = buildRecord()

    renderWithLanguage(
      <SalesReturnRecordMaster
        records={[record]}
        selectedId={record.id}
        onSelect={vi.fn()}
        onDelete={onDelete}
      />
    )

    await user.click(screen.getByRole('button', { name: '删除退货单' }))

    expect(screen.getByText('确认删除销售退货单')).toBeTruthy()
    expect(screen.getByText(/即将删除真实销售退货单 SR-001/)).toBeTruthy()

    await user.click(screen.getByRole('button', { name: '确认删除' }))

    expect(onDelete).toHaveBeenCalledWith(record)
  })

  it('does not show a fake delete action when the list context has no real delete handler', () => {
    const view = renderWithLanguage(
      <SalesReturnRecordMaster
        records={[buildRecord()]}
        selectedId='sr-1'
        onSelect={vi.fn()}
      />
    )

    expect(within(view.container).queryByRole('button', { name: '删除退货单' })).toBeNull()
  })

  it('renders the right card as an edit and supplement panel', () => {
    renderWithLanguage(
      <SalesReturnRecordSpotlight
        record={buildRecord()}
        isLoading={false}
        onClearSelection={vi.fn()}
      />
    )

    expect(screen.getByText('退货编辑与补录面板')).toBeTruthy()
    expect(screen.getByRole('button', { name: '收起右侧面板' })).toBeTruthy()
  })
})
