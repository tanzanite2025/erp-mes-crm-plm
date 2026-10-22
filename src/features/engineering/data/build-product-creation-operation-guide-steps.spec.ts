import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import {
  engineeringPermissionTabs,
  engineeringTabs,
  getEngineeringTabs,
  getProductCreationGuideTabs,
} from '../tab-config'
import { buildProductCreationOperationGuideSteps } from './build-product-creation-operation-guide-steps'

const translateProductCreationGuideLabel = (key: TranslationKey) =>
  translate('zh-CN', key)

describe('product creation guide route permissions and sequence', () => {
  it('keeps the handbook TAB independent while retaining its existing permissions and route', () => {
    const guideRoute = '/engineering/product-creation-guide'
    expect(engineeringTabs.some((tab) => tab.href === guideRoute)).toBe(false)
    expect(
      getEngineeringTabs(translateProductCreationGuideLabel).some(
        (tab) => tab.href === guideRoute
      )
    ).toBe(false)
    expect(
      engineeringPermissionTabs(translateProductCreationGuideLabel).some(
        (tab) => tab.href === guideRoute
      )
    ).toBe(true)
    const tabs = getProductCreationGuideTabs(translateProductCreationGuideLabel)
    for (const permission of [
      'menu_engineering',
      'tab_engineering_product_creation_guide',
    ]) {
      expect(
        getProjectedTabsFromPermissionSnapshot(
          { permissions: [permission] },
          tabs
        ).some((tab) => tab.href === guideRoute)
      ).toBe(true)
    }
    expect(
      getProjectedTabsFromPermissionSnapshot(
        { permissions: ['menu_dashboard'] },
        tabs
      )
    ).toEqual([])
  })
  it('includes the base model page and places product creation before the optional BOM step', () => {
    const steps = buildProductCreationOperationGuideSteps(
      { permissions: ['menu_engineering'] },
      translateProductCreationGuideLabel
    )
    expect(steps.map((step) => step.href)).toEqual([
      '/engineering/templates',
      '/engineering/types',
      '/engineering/products',
      '/product-structure/bom',
    ])
    expect(steps.every((step) => step.canAccess)).toBe(true)
    expect(steps[2].stage).toBe('product')
    expect(steps[3].stage).toBe('followup')
  })

  it('keeps missing prerequisites in their original sequence without granting access', () => {
    const steps = buildProductCreationOperationGuideSteps(
      { permissions: ['tab_engineering_products'] },
      translateProductCreationGuideLabel
    )
    expect(steps.map((step) => step.number)).toEqual([1, 2, 3, 4])
    expect(
      steps.filter((step) => step.canAccess).map((step) => step.href)
    ).toEqual(['/engineering/products'])
  })

  it('does not expose an accessible product workflow for accounts without product access', () => {
    const steps = buildProductCreationOperationGuideSteps(
      { permissions: ['menu_dashboard'] },
      translateProductCreationGuideLabel
    )
    expect(steps.some((step) => step.canAccess)).toBe(false)
    expect(translateProductCreationGuideLabel('home.title')).toBe('首页')
  })
})
