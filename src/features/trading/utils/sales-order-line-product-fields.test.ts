import { describe, expect, it } from 'vitest'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { createEmptySalesOrderLine } from '../data/schema'
import {
  buildSalesOrderLineProductFields,
  mergeSalesOrderLineProductFields,
} from './sales-order-line-product-fields'

function buildDisplayProjection(overrides: Partial<{
  title: string
  summaryText: string
  code: string
  fullLabel: string
  strategyVersion: 'product-display-v2'
}> = {}) {
  return {
    title: 'R50',
    code: 'MTB-01',
    summaryItems: [],
    summaryText: '高刚性 / 碟刹 / 标准',
    fullLabel: 'R50 (高刚性 / 碟刹 / 标准)',
    strategyVersion: 'product-display-v2' as const,
    ...overrides,
  }
}

describe('sales-order-line-product-fields', () => {
  it('builds consistent product-derived order line fields from the authority v2 projection', () => {
    const product = createProductDraft({
      sku: 'MTB-01',
      name: 'R50',
      modelCode: '01',
      barcodeConfig: {
        modelCode: '01',
        appearanceCode: '1',
        category: 'R',
        holes: 24,
        isDrainHole: false,
        wheelType: 'H',
        scopeCode: '',
        suffix: '',
        serialNumber: '00001',
      },
    })
    const projection = buildDisplayProjection()

    expect(buildSalesOrderLineProductFields(product, projection)).toEqual({
      productModel: 'MTB-01',
      productCode: 'MTB-01',
      specification: 'R50 (高刚性 / 碟刹 / 标准)',
      productDisplayTitleSnapshot: 'R50',
      productDisplaySubtitleSnapshot: '高刚性 / 碟刹 / 标准',
      productDisplayCodeSnapshot: 'MTB-01',
      productDisplayFullLabelSnapshot: 'R50 (高刚性 / 碟刹 / 标准)',
      productDisplayStrategyVersionSnapshot: 'product-display-v2',
      modelCodeSnapshot: '01',
      holePrefixSnapshot: 'R',
    })
  })

  it('fills blank fields and replaces generated UNNAMED placeholders on save using the authority v2 projection', () => {
    const product = createProductDraft({
      sku: 'MTB-01',
      name: 'R50',
      modelCode: '01',
    })
    const projection = buildDisplayProjection({
      summaryText: '',
      fullLabel: 'R50',
    })
    const line = {
      ...createEmptySalesOrderLine(),
      productId: 'product-1',
      specification: 'UNNAMED (normal/UNKNOWN/std)',
      productDisplayTitleSnapshot: 'UNNAMED',
      productDisplayFullLabelSnapshot: 'UNNAMED',
    }

    expect(mergeSalesOrderLineProductFields(line, product, projection)).toMatchObject({
      productModel: 'MTB-01',
      productCode: 'MTB-01',
      specification: 'R50',
      productDisplayTitleSnapshot: 'R50',
      productDisplayFullLabelSnapshot: 'R50',
      productDisplayStrategyVersionSnapshot: 'product-display-v2',
      modelCodeSnapshot: '01',
    })
  })
})
