import { describe, expect, it } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import {
  formatProductDisplay,
  PRODUCT_DISPLAY_STRATEGY_VERSION,
  resolveProductDisplay,
  toProductDisplayFacts,
} from './product-display-contract'

function buildProductAttributeValue(categoryKey: string, optionValue: string) {
  return {
    categoryKey,
    optionValue,
    sortOrder: 0,
    version: 1,
  }
}

describe('product-display-contract', () => {
  it('builds a structured display projection from authoritative product facts', () => {
    const product = createProductDraft({
      name: 'Road Fork',
      sku: 'RF-01',
      modelCode: '01',
      attributeValues: [
        buildProductAttributeValue('techSeries', 'high-tg'),
        buildProductAttributeValue('brakeType', 'disc'),
        buildProductAttributeValue('versionLevel', 'reinforced'),
      ],
    })

    expect(resolveProductDisplay(product)).toEqual({
      title: 'Road Fork',
      subtitle: 'high-tg/disc/reinforced',
      code: 'RF-01',
      fullLabel: 'Road Fork (high-tg/disc/reinforced)',
      strategyVersion: PRODUCT_DISPLAY_STRATEGY_VERSION,
    })
  })

  it('falls back to the product code when the display title is missing', () => {
    const product = createProductDraft({
      name: '',
      sku: 'RF-01',
    })

    expect(resolveProductDisplay(product)).toEqual({
      title: 'RF-01',
      subtitle: 'normal/UNKNOWN/std',
      code: 'RF-01',
      fullLabel: 'RF-01 (normal/UNKNOWN/std)',
      strategyVersion: PRODUCT_DISPLAY_STRATEGY_VERSION,
    })
  })

  it('returns a stable unnamed projection when no product facts are available', () => {
    expect(resolveProductDisplay(null)).toEqual({
      title: 'UNNAMED',
      subtitle: '',
      code: '',
      fullLabel: 'UNNAMED',
      strategyVersion: PRODUCT_DISPLAY_STRATEGY_VERSION,
    })
  })

  it('normalizes raw product facts before display resolution', () => {
    expect(
      toProductDisplayFacts({
        name: '  Road Fork  ',
        sku: '  RF-01  ',
        modelCode: '  01  ',
        attributeValues: [],
      })
    ).toEqual({
      name: 'Road Fork',
      sku: 'RF-01',
      modelCode: '01',
      attributeValues: [],
    })
  })

  it('formats the default display label from the unified projection', () => {
    const product = createProductDraft({
      name: 'Road Fork',
      sku: 'RF-01',
    })

    expect(formatProductDisplay(product)).toBe('Road Fork (normal/UNKNOWN/std)')
  })
})
