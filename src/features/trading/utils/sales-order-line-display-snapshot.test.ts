import { describe, expect, it } from 'vitest'
import { createEmptySalesOrderLine } from '../data/schema'
import {
  buildSalesOrderLineDisplaySnapshot,
  mergeSalesOrderLineDisplaySnapshot,
} from './sales-order-line-display-snapshot'

function buildDisplayProjection(overrides: Partial<{
  title: string
  summaryText: string
  code: string
  fullLabel: string
  strategyVersion: 'product-display-v2'
}> = {}) {
  return {
    title: 'Road Fork',
    code: 'RF-01',
    summaryItems: [],
    summaryText: '高刚性 / 碟刹 / 加强版',
    fullLabel: 'Road Fork (高刚性 / 碟刹 / 加强版)',
    strategyVersion: 'product-display-v2' as const,
    ...overrides,
  }
}

describe('sales-order-line-display-snapshot', () => {
  it('builds sales order line snapshot fields from the authority v2 product display projection', () => {
    const projection = buildDisplayProjection()

    expect(buildSalesOrderLineDisplaySnapshot(projection)).toEqual({
      productDisplayTitleSnapshot: 'Road Fork',
      productDisplaySubtitleSnapshot: '高刚性 / 碟刹 / 加强版',
      productDisplayCodeSnapshot: 'RF-01',
      productDisplayFullLabelSnapshot: 'Road Fork (高刚性 / 碟刹 / 加强版)',
      productDisplayStrategyVersionSnapshot: 'product-display-v2',
    })
  })

  it('preserves existing order line snapshots when saving historical lines', () => {
    const projection = buildDisplayProjection()
    const line = {
      ...createEmptySalesOrderLine(),
      productDisplayTitleSnapshot: 'Historical Title',
      productDisplaySubtitleSnapshot: 'historical/subtitle',
      productDisplayCodeSnapshot: 'HIS-01',
      productDisplayFullLabelSnapshot: 'Historical Title (historical/subtitle)',
      productDisplayStrategyVersionSnapshot: 'product-display-v0',
    }

    expect(mergeSalesOrderLineDisplaySnapshot(line, projection)).toEqual({
      productDisplayTitleSnapshot: 'Historical Title',
      productDisplaySubtitleSnapshot: 'historical/subtitle',
      productDisplayCodeSnapshot: 'HIS-01',
      productDisplayFullLabelSnapshot: 'Historical Title (historical/subtitle)',
      productDisplayStrategyVersionSnapshot: 'product-display-v0',
    })
  })

  it('rebuilds generated UNNAMED placeholder snapshots from the current authority v2 projection', () => {
    const projection = buildDisplayProjection({
      summaryText: '',
      fullLabel: 'Road Fork',
    })
    const line = {
      ...createEmptySalesOrderLine(),
      productDisplayTitleSnapshot: 'UNNAMED',
      productDisplaySubtitleSnapshot: 'normal/UNKNOWN/std',
      productDisplayCodeSnapshot: '',
      productDisplayFullLabelSnapshot: 'UNNAMED',
      productDisplayStrategyVersionSnapshot: 'product-display-v1',
    }

    expect(mergeSalesOrderLineDisplaySnapshot(line, projection)).toEqual({
      productDisplayTitleSnapshot: 'Road Fork',
      productDisplaySubtitleSnapshot: '',
      productDisplayCodeSnapshot: 'RF-01',
      productDisplayFullLabelSnapshot: 'Road Fork',
      productDisplayStrategyVersionSnapshot: 'product-display-v2',
    })
  })

  it('fills missing order line snapshots from the authority v2 product display projection', () => {
    const projection = buildDisplayProjection({
      summaryText: '高刚性',
      fullLabel: 'Road Fork (高刚性)',
    })

    expect(mergeSalesOrderLineDisplaySnapshot(createEmptySalesOrderLine(), projection)).toEqual({
      productDisplayTitleSnapshot: 'Road Fork',
      productDisplaySubtitleSnapshot: '高刚性',
      productDisplayCodeSnapshot: 'RF-01',
      productDisplayFullLabelSnapshot: 'Road Fork (高刚性)',
      productDisplayStrategyVersionSnapshot: 'product-display-v2',
    })
  })
})
