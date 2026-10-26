import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { resolveSidebarNodeTabPreviews } from '../sidebar-tab-preview-registry'
import type { NavNode } from '../types'
import { matchesGlobalSearchItemKeywords } from './global-search-keyword-matching'
import { getKnowledgeRouteOptions, getSearchItems } from './search-data'
import { getSidebarData } from './sidebar-data'

const translateChineseNavigation = (key: TranslationKey) =>
  translate('zh-CN', key)

describe('global search navigation coverage and keyword matching', () => {
  it('covers every sidebar domain and its feature tabs without duplicate destinations', () => {
    const modules = getSearchItems(translateChineseNavigation).filter(
      (item) => item.category === 'modules'
    )
    const indexedHrefs = modules.map((item) => item.href)
    const expectedHrefs = new Set<string>()

    function collectExpectedSidebarSearchDestinations(nodes: NavNode[]) {
      for (const node of nodes) {
        if (node.url) expectedHrefs.add(node.url)
        for (const tab of resolveSidebarNodeTabPreviews(
          node,
          translateChineseNavigation
        )) {
          expectedHrefs.add(tab.href)
        }
        if (node.children)
          collectExpectedSidebarSearchDestinations(node.children)
      }
    }

    for (const group of getSidebarData(translateChineseNavigation).navGroups) {
      collectExpectedSidebarSearchDestinations(group.children)
    }
    expect(indexedHrefs).toEqual(expect.arrayContaining([...expectedHrefs]))
    expect(new Set(indexedHrefs).size).toBe(indexedHrefs.length)
    expect(modules.length).toBeGreaterThan(150)
    expect(indexedHrefs.some((href) => href.includes(':'))).toBe(false)
    expect(
      getKnowledgeRouteOptions(translateChineseNavigation).map(
        (item) => item.value
      )
    ).toEqual(indexedHrefs)
  })

  it.each([
    ['采购 订单', '/purchase/orders'],
    ['采购 供应商', '/purchase/suppliers'],
    ['finance currency', '/finance-management/currency-rates'],
    ['maintenance records', '/equipment-maintenance/records'],
    ['销售 退货', '/trading/sales-returns'],
    ['排产', '/aps-scheduling/board'],
    ['ＢＯＭ', '/engineering/bom'],
    ['　 dwgl　', '/basic-settings/units'],
  ])('finds %s at %s', (keyword, href) => {
    const matches = getSearchItems(translateChineseNavigation).filter((item) =>
      matchesGlobalSearchItemKeywords(item, keyword)
    )
    expect(matches.map((item) => item.href)).toContain(href)
  })

  it('keeps Chinese business names searchable while the UI uses English', () => {
    const englishItems = getSearchItems((key) => translate('en-US', key))
    expect(
      englishItems.find((item) => item.href === '/materials/RAW_MATERIAL')
        ?.title
    ).toBe(
      translate('en-US', 'materialArchive.form.fallbackCategories.rawMaterial')
    )
    expect(
      englishItems
        .filter((item) => matchesGlobalSearchItemKeywords(item, '采购 订单'))
        .map((item) => item.href)
    ).toContain('/purchase/orders')
  })
})
