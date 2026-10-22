import { describe, expect, it } from 'vitest'
import {
  completeProductCreationGuideStep,
  createEmptyProductCreationGuideProgress,
  getCurrentProductCreationGuideStep,
  productCreationGuideProgressSchema,
  productCreationOperationGuideStepKeys,
} from './product-creation-operation-guide-progress'

function buildProductCreationGuideProgressThroughProductSave() {
  let progress = createEmptyProductCreationGuideProgress()
  for (const step of productCreationOperationGuideStepKeys.slice(0, 3)) {
    progress = completeProductCreationGuideStep(progress, step, {
      id: step,
      label: step,
      version: 1,
    })
  }
  return progress
}

describe('product creation wizard confirmations and dependencies', () => {
  it('starts with template reuse and requires confirmations in sequence', () => {
    const emptyProgress = createEmptyProductCreationGuideProgress()
    expect(getCurrentProductCreationGuideStep(emptyProgress)).toBe('template')
    expect(() =>
      completeProductCreationGuideStep(emptyProgress, 'product', {
        id: 'p1',
        label: 'Product',
      })
    ).toThrow()
    const progress = buildProductCreationGuideProgressThroughProductSave()
    expect(getCurrentProductCreationGuideStep(progress)).toBe('bom')
    expect(
      getCurrentProductCreationGuideStep({ ...progress, bomSkipped: true })
    ).toBeNull()
    expect(
      getCurrentProductCreationGuideStep({ ...progress, bomSkipped: false })
    ).toBe('bom')
  })

  it('preserves later confirmations when reusing the same template or model', () => {
    const progress = {
      ...buildProductCreationGuideProgressThroughProductSave(),
      bomSkipped: true,
    }
    const reconfirmed = completeProductCreationGuideStep(progress, 'template', {
      id: 'template',
      label: 'Renamed template',
      version: 1,
    })
    expect(reconfirmed.completedSteps.product).toEqual(
      progress.completedSteps.product
    )
    expect(reconfirmed.bomSkipped).toBe(true)
    expect(
      completeProductCreationGuideStep(
        reconfirmed,
        'baseModel',
        progress.completedSteps.baseModel!
      )
    ).toEqual(reconfirmed)
  })

  it('clears dependent confirmations after changing a template and retains the previous records', () => {
    const progress = buildProductCreationGuideProgressThroughProductSave()
    const changed = completeProductCreationGuideStep(progress, 'template', {
      id: 'another-template',
      label: 'Another template',
    })
    expect(Object.keys(changed.completedSteps)).toEqual(['template'])
    expect(changed.bomSkipped).toBe(false)
    expect(getCurrentProductCreationGuideStep(changed)).toBe('baseModel')
    expect(progress.completedSteps.product?.id).toBe('product')
    const changedVersion = completeProductCreationGuideStep(
      progress,
      'template',
      { ...progress.completedSteps.template!, version: 2 }
    )
    expect(changedVersion.completedSteps.product).toBeUndefined()
  })

  it('preserves template confirmation but clears product and BOM when the model changes', () => {
    const progress = completeProductCreationGuideStep(
      buildProductCreationGuideProgressThroughProductSave(),
      'bom',
      { id: 'bom1', label: 'BOM' }
    )
    const changed = completeProductCreationGuideStep(progress, 'baseModel', {
      id: 'another-model',
      label: 'Another model',
    })
    expect(changed.completedSteps.template).toEqual(
      progress.completedSteps.template
    )
    expect(changed.completedSteps.product).toBeUndefined()
    expect(changed.completedSteps.bom).toBeUndefined()
    expect(progress.completedSteps.bom?.id).toBe('bom1')
  })

  it('migrates earlier progress without requiring a separate attribute step', () => {
    const progress = buildProductCreationGuideProgressThroughProductSave()
    const migrated = productCreationGuideProgressSchema.parse({
      ...progress,
      completedSteps: {
        attributes: { id: 'attributes', label: 'Attributes' },
        ...progress.completedSteps,
      },
    })
    expect(migrated).toEqual(progress)
    expect(
      productCreationGuideProgressSchema.parse({
        completedSteps: {
          attributes: { id: 'attributes', label: 'Attributes' },
        },
        bomSkipped: false,
      })
    ).toEqual(createEmptyProductCreationGuideProgress())
    expect(
      productCreationGuideProgressSchema.safeParse({
        completedSteps: { product: { id: 'p1', label: 'Product' } },
        bomSkipped: false,
      }).success
    ).toBe(false)
    expect(
      productCreationGuideProgressSchema.safeParse({
        completedSteps: {},
        bomSkipped: true,
      }).success
    ).toBe(false)
  })
})
