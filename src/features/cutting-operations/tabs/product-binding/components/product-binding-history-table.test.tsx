// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductBindingRecord } from '../services/product-binding-service'

const {
  qrCellSpy,
  barcodeCellSpy,
  emptyStateSpy,
  formatBoundAtSpy,
} = vi.hoisted(() => ({
  qrCellSpy: vi.fn(),
  barcodeCellSpy: vi.fn(),
  emptyStateSpy: vi.fn(),
  formatBoundAtSpy: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key
      return `${key}:${JSON.stringify(params)}`
    },
  }),
}))

vi.mock('./product-binding-history-cell-renderers', () => ({
  HistoryQrCodeCell: (props: unknown) => {
    qrCellSpy(props)
    return <div data-testid='qr-cell' />
  },
  HistoryProductBarcodeCell: (props: unknown) => {
    barcodeCellSpy(props)
    return <div data-testid='barcode-cell' />
  },
}))

vi.mock('./product-binding-history-empty-state', () => ({
  ProductBindingHistoryEmptyState: () => {
    emptyStateSpy()
    return <div data-testid='empty-state' />
  },
}))

vi.mock('../product-binding-history-formatters', () => ({
  formatProductBindingBoundAtLabel: (...args: unknown[]) => {
    formatBoundAtSpy(...args)
    return '2026/04/30 08:15'
  },
}))

import { ProductBindingHistoryTable } from './product-binding-history-table'

function buildRecord(overrides: Partial<ProductBindingRecord> = {}): ProductBindingRecord {
  return {
    id: 'binding-1',
    productBarcode: 'PROD-001',
    prepregRollInstanceId: 'roll-1',
    prepregRollInstance: {
      id: 'roll-1',
      bindingToken: 'PREPREG-BIND-001',
      specId: 'spec-1',
      specCode: 'SPEC-001',
      specName: 'Test Spec',
      supplierBatchNo: 'BATCH-001',
      widthMm: '1200',
      lengthM: '100',
      nominalAreaM2: '120',
      boxNo: 'BOX-001',
      productionDate: '2026-04-29',
      status: 'Active',
      activatedAt: '2026-04-29T00:00:00.000Z',
    },
    prepregQrCode: 'QR-001',
    prepregBindingToken: 'PREPREG-BIND-001',
    barcodeProtocol: 'CODE128',
    barcodeSummary: 'summary',
    boundAt: '2026-04-30T08:15:00',
    boundBy: 'tester',
    source: 'manual',
    status: 'BOUND',
    message: '',
    ...overrides,
  }
}

describe('ProductBindingHistoryTable', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when there are no items and not loading', () => {
    render(
      <ProductBindingHistoryTable
        items={[]}
        isLoading={false}
        error={null}
        latestBindingId=''
        historyTotal={0}
      />
    )

    expect(screen.getByTestId('empty-state')).toBeTruthy()
    expect(emptyStateSpy).toHaveBeenCalled()
  })

  it('renders error message when query fails', () => {
    render(
      <ProductBindingHistoryTable
        items={[]}
        isLoading={false}
        error={new Error('history-failed')}
        latestBindingId=''
        historyTotal={0}
      />
    )

    expect(
      screen.getByText('cuttingOperations.productBinding.history.error:{"message":"history-failed"}')
    ).toBeTruthy()
  })

  it('passes row values into renderer and formatter collaborators', () => {
    render(
      <ProductBindingHistoryTable
        items={[buildRecord()]}
        isLoading={false}
        error={null}
        latestBindingId='binding-1'
        historyTotal={1}
      />
    )

    expect(screen.getByTestId('qr-cell')).toBeTruthy()
    expect(screen.getByTestId('barcode-cell')).toBeTruthy()
    expect(screen.getByText('2026/04/30 08:15')).toBeTruthy()

    expect(qrCellSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'QR-001',
        isLatest: true,
      })
    )
    expect(barcodeCellSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        productBarcode: 'PROD-001',
      })
    )
    expect(formatBoundAtSpy).toHaveBeenCalledWith('2026-04-30T08:15:00', 'zh-CN')
  })
})
