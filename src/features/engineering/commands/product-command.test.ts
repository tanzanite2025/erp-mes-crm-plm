import { describe, expect, it } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import { ProductCommand } from './product-command'

describe('ProductCommand.composeSubmitPayload', () => {
  it('marks multiple selected variants as multi-variant instead of batch transaction semantics', () => {
    const values = createProductDraft({
      name: 'Fork Product',
      typeId: 'type-1',
      modelCode: '01',
      weight: 10,
    })

    const result = ProductCommand.composeSubmitPayload({
      values,
      selectedVariants: [
        { level: 'V1', weight: 10 },
        { level: 'V2', weight: 11 },
      ],
      typeCode: 'FK',
      isEdit: false,
    })

    expect(result.mode).toBe('multi-variant')
    expect(result.productsToSave).toHaveLength(2)
  })
})
