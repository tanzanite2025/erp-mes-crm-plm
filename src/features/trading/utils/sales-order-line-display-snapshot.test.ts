import { describe, expect, it } from 'vitest'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { createEmptySalesOrderLine } from '../data/schema'
import {
  buildSalesOrderLineDisplaySnapshot,
  mergeSalesOrderLineDisplaySnapshot,
} from './sales-order-line-display-snapshot'

function buildProductAttributeValue(categoryKey: string, optionValue: string) {
  return {
    categoryKey,
    optionValue,
    sortOrder: 0,
    version: 1,
  }
}

describe('sales-order-line-display-snapshot', () => {
  it('builds sales order line snapshot fields from the unified product display projection', () => {
    const product = createProductDraft({
      name: 'Road Fork',
      sku: 'RF-01',
      attributeValues: [
        buildProductAttributeValue('techSeries', 'high-tg'),
        buildProductAttributeValue('brakeType', 'disc'),
        buildProductAttributeValue('versionLevel', 'reinforced'),
      ],
    })

    expect(buildSalesOrderLineDisplaySnapshot(product)).toEqual({
      productDisplayTitleSnapshot: 'Road Fork',
      productDisplaySubtitleSnapshot: 'high-tg/disc/reinforced',
      productDisplayCodeSnapshot: 'RF-01',
      productDisplayFullLabelSnapshot: 'Road Fork (high-tg/disc/reinforced)',
      productDisplayStrategyVersionSnapshot: 'product-display-v1',
    })
  })

  it('preserves existing order line snapshots when saving historical lines', () => {
    const product = createProductDraft({
      name: 'Road Fork',
      sku: 'RF-01',
    })
    const line = {
      ...createEmptySalesOrderLine(),
      productDisplayTitleSnapshot: 'Historical Title',
      productDisplaySubtitleSnapshot: 'historical/subtitle',
      productDisplayCodeSnapshot: 'HIS-01',
      productDisplayFullLabelSnapshot: 'Historical Title (historical/subtitle)',
      productDisplayStrategyVersionSnapshot: 'product-display-v0',
    }

    expect(mergeSalesOrderLineDisplaySnapshot(line, product)).toEqual({
      productDisplayTitleSnapshot: 'Historical Title',
      productDisplaySubtitleSnapshot: 'historical/subtitle',
      productDisplayCodeSnapshot: 'HIS-01',
      productDisplayFullLabelSnapshot: 'Historical Title (historical/subtitle)',
      productDisplayStrategyVersionSnapshot: 'product-display-v0',
    })
  })

  it('fills missing order line snapshots from the unified product display projection', () => {
    const product = createProductDraft({
      name: 'Road Fork',
      sku: 'RF-01',
    })

    expect(mergeSalesOrderLineDisplaySnapshot(createEmptySalesOrderLine(), product)).toEqual({
      productDisplayTitleSnapshot: 'Road Fork',
      productDisplaySubtitleSnapshot: 'normal/UNKNOWN/std',
      productDisplayCodeSnapshot: 'RF-01',
      productDisplayFullLabelSnapshot: 'Road Fork (normal/UNKNOWN/std)',
      productDisplayStrategyVersionSnapshot: 'product-display-v1',
    })
  })
})
