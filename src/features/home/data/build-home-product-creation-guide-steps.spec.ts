import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { buildHomeProductCreationGuideSteps } from './build-home-product-creation-guide-steps'

const translateProductCreationGuideLabel = (key: TranslationKey) =>
  translate('zh-CN', key)

describe('product creation guide route permissions and sequence', () => {
  it('includes the base model page and places product creation before the optional BOM step', () => {
    const steps = buildHomeProductCreationGuideSteps(
      { permissions: ['menu_engineering'] },
      translateProductCreationGuideLabel
    )
    expect(steps.map((step) => step.href)).toEqual([
      '/engineering/product-attributes',
      '/engineering/templates',
      '/engineering/types',
      '/engineering/products',
      '/product-structure/bom',
    ])
    expect(steps.every((step) => step.canAccess)).toBe(true)
    expect(steps[3].stage).toBe('product')
    expect(steps[4].stage).toBe('followup')
  })

  it('keeps missing prerequisites in their original sequence without granting access', () => {
    const steps = buildHomeProductCreationGuideSteps(
      { permissions: ['tab_engineering_products'] },
      translateProductCreationGuideLabel
    )
    expect(steps.map((step) => step.number)).toEqual([1, 2, 3, 4, 5])
    expect(
      steps.filter((step) => step.canAccess).map((step) => step.href)
    ).toEqual(['/engineering/products'])
  })

  it('does not expose an accessible product workflow for accounts without product access', () => {
    const steps = buildHomeProductCreationGuideSteps(
      { permissions: ['menu_dashboard'] },
      translateProductCreationGuideLabel
    )
    expect(steps.some((step) => step.canAccess)).toBe(false)
    expect(translateProductCreationGuideLabel('home.title')).toBe('首页')
  })
})
