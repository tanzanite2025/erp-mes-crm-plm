import { describe, expect, it } from 'vitest'
import type { SalesOrderLine } from '@/features/trading/data/schema'
import { buildSalesExchangeLineDraftFromSalesOrderLine } from './sales-exchange-label-code-parser'

function buildSalesOrderLine(overrides: Partial<SalesOrderLine> = {}): SalesOrderLine {
  return {
    id: 1,
    lineNo: 1,
    productId: 'prod-1',
    productCode: 'PC-1',
    productModel: 'PM-1',
    specification: 'Spec',
    productDisplayTitleSnapshot: 'Fork Alpha',
    productDisplaySubtitleSnapshot: 'trail/disc/v2',
    productDisplayCodeSnapshot: 'PC-1',
    productDisplayFullLabelSnapshot: 'Fork Alpha (trail/disc/v2)',
    productDisplayStrategyVersionSnapshot: 'product-display-v1',
    description: 'Desc',
    qty: 10,
    uom: 'PCS',
    price: 12.5,
    amount: 125,
    deliveredQty: 5,
    customerPartNo: 'CP-1',
    jobNo: 'JOB-1',
    orderDate: '2026-05-10',
    status: 'InProgress',
    returnedQuantity: 0,
    remainingReturnableQuantity: 10,
    ...overrides,
  }
}

describe('sales-exchange-label-code-parser', () => {
  it('carries order line display snapshot fields into exchange drafts', () => {
    const draft = buildSalesExchangeLineDraftFromSalesOrderLine(buildSalesOrderLine())

    expect(draft.productDisplayTitleSnapshot).toBe('Fork Alpha')
    expect(draft.productDisplaySubtitleSnapshot).toBe('trail/disc/v2')
    expect(draft.productDisplayFullLabelSnapshot).toBe('Fork Alpha (trail/disc/v2)')
    expect(draft.productDisplayStrategyVersionSnapshot).toBe('product-display-v1')
  })
})
