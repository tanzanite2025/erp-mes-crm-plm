import { describe, expect, it } from 'vitest'
import { findTemplateForOrder, getCompatibleTemplates, isTemplateCompatible } from './template-matcher'
import type { CuttingIssuanceOrderLine, CuttingIssuanceTemplate } from './types'

const orderLine: CuttingIssuanceOrderLine = {
  lineNo: 10,
  productModel: 'TR-01',
  productCode: 'TR-01-A',
  productId: 'product-1',
  holeCount: 32,
  requestedQuantity: 120,
}

const templates: CuttingIssuanceTemplate[] = [
  {
    id: 'template-old',
    planName: 'TR-01 old',
    productModel: 'TR-01',
    productCode: 'TR-01-A',
    holeCount: 32,
    version: 'v1',
    templateLineCount: 18,
    updatedAt: '2026-03-01T08:00:00.000Z',
  },
  {
    id: 'template-new',
    planName: 'TR-01 new',
    productModel: 'TR 01',
    productCode: 'TR-01-A',
    holeCount: 32,
    version: 'v2',
    templateLineCount: 20,
    updatedAt: '2026-04-10T08:00:00.000Z',
  },
  {
    id: 'template-wrong-hole',
    planName: 'TR-01 wrong hole',
    productModel: 'TR-01',
    productCode: 'TR-01-A',
    holeCount: 28,
    version: 'v1',
    templateLineCount: 16,
    updatedAt: '2026-04-12T08:00:00.000Z',
  },
]

describe('cutting issuance template matcher', () => {
  it('matches templates by normalized model and exact hole count', () => {
    expect(isTemplateCompatible(orderLine, templates[0])).toBe(true)
    expect(isTemplateCompatible(orderLine, templates[1])).toBe(true)
    expect(isTemplateCompatible(orderLine, templates[2])).toBe(false)
  })

  it('returns compatible templates sorted by latest update time first', () => {
    const result = getCompatibleTemplates(orderLine, templates)
    expect(result.map((item) => item.id)).toEqual(['template-new', 'template-old'])
  })

  it('picks the newest compatible template as the default match', () => {
    expect(findTemplateForOrder(orderLine, templates)?.id).toBe('template-new')
  })

  it('falls back to product code matching when the template model is empty', () => {
    const codeOnlyTemplate: CuttingIssuanceTemplate = {
      id: 'template-code-only',
      planName: 'TR-01 code only',
      productModel: '',
      productCode: 'TR-01-A',
      holeCount: 32,
      version: 'v3',
      templateLineCount: 22,
      updatedAt: '2026-04-15T08:00:00.000Z',
    }

    expect(isTemplateCompatible(orderLine, codeOnlyTemplate)).toBe(true)
  })
})
