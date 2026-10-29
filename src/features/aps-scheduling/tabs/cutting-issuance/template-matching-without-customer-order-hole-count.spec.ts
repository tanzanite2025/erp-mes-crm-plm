import { describe, expect, it } from 'vitest'
import {
  findTemplateForOrder,
  getCompatibleTemplates,
  isTemplateCompatible,
} from './template-matcher'
import type { CuttingIssuanceOrderLine, CuttingIssuanceTemplate } from './types'

const cuttingTemplate: CuttingIssuanceTemplate = {
  id: 'plan-1',
  planName: 'R50-裁纱单',
  productModel: 'R50',
  productCode: 'R50-SKU',
  version: 'A1',
  templateLineCount: 2,
  updatedAt: '2026-10-26T00:00:00Z',
}

const orderLine: CuttingIssuanceOrderLine = {
  lineNo: 1,
  productModel: 'R50',
  productCode: 'R50-SKU',
  holeCount: 24,
  requestedQuantity: 10,
}

describe('cutting template matching without customer-order hole count', () => {
  it.each([0, 14, 24, 28, 32])(
    'reuses the same model template for an order with %i holes',
    (holeCount) => {
      expect(
        isTemplateCompatible({ ...orderLine, holeCount }, cuttingTemplate)
      ).toBe(true)
      expect(
        findTemplateForOrder({ ...orderLine, holeCount }, [cuttingTemplate])
      ).toBe(cuttingTemplate)
    }
  )

  it('continues to reject unrelated product models', () => {
    expect(
      isTemplateCompatible(
        { ...orderLine, productModel: 'R60', productCode: 'R60-SKU' },
        cuttingTemplate
      )
    ).toBe(false)
    expect(isTemplateCompatible(undefined, cuttingTemplate)).toBe(false)
  })

  it('requires explicit selection when multiple cutting plans match the model', () => {
    const otherRecipeTemplate = {
      ...cuttingTemplate,
      id: 'reinforced-plan',
      version: 'A2',
    }
    const templates = [cuttingTemplate, otherRecipeTemplate]
    expect(getCompatibleTemplates(orderLine, templates)).toHaveLength(2)
    expect(findTemplateForOrder(orderLine, templates)).toBeUndefined()
  })
})
