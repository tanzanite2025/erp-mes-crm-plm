import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import { engineeringPermissionTabs } from '@/features/engineering/tab-config'
import { getBOMCreationOperationGuideTabs } from '@/features/product-structure/bom-creation-operation-guide-tab-config'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { createSidebarCategoryPreviews } from './sidebar-category-scrubber-utils'
import { checkIsActive } from './sidebar-nav-utils'
import { resolveSidebarNodeTabPreviews } from './sidebar-tab-preview-registry'

const translateProductHandbookNavigationLabel = (key: TranslationKey) =>
  translate('zh-CN', key)
const productHandbookRoute = '/engineering/product-creation-guide'
const bomHandbookRoute = '/engineering/bom-creation-guide'

function createProductHandbookNavigationForPermissions(permissions: string[]) {
  const user = { permissions }
  const groups = getAccessibleNavGroups(
    user,
    getSidebarData(translateProductHandbookNavigationLabel).navGroups
  )
  const directories = createSidebarCategoryPreviews(groups, (node) =>
    getProjectedTabsFromPermissionSnapshot(
      user,
      resolveSidebarNodeTabPreviews(
        node,
        translateProductHandbookNavigationLabel
      )
    )
  )
  return { groups, directories }
}

describe('product handbook category and existing route permissions', () => {
  it('provides sibling product and BOM handbooks and selects only the relevant handbook branch', () => {
    const { groups, directories } =
      createProductHandbookNavigationForPermissions(['menu_engineering'])
    const productDirectory = directories.find(
      (directory) => directory.id === 'product-management'
    )!
    const handbookSection = productDirectory.sections.find(
      (section) => section.id === 'product-handbook-group'
    )!
    expect(handbookSection.title).toBe('产品操作手册')
    expect(handbookSection.links).toHaveLength(2)
    expect(handbookSection.links[0]).toMatchObject({
      title: '如何建立产品',
      url: productHandbookRoute,
      tabs: [],
    })
    expect(handbookSection.links[1]).toMatchObject({
      title: '如何建立 BOM',
      url: bomHandbookRoute,
      tabs: [],
    })
    const allEntries = productDirectory.sections.flatMap((section) =>
      section.links.flatMap((link) => (link.tabs.length ? link.tabs : [link]))
    )
    expect(
      allEntries.filter((entry) => entry.url === productHandbookRoute)
    ).toHaveLength(1)
    expect(
      allEntries.filter((entry) => entry.url === bomHandbookRoute)
    ).toHaveLength(1)
    expect(
      allEntries.some(
        (entry) => entry.url === '/engineering/product-attributes'
      )
    ).toBe(false)
    expect(
      allEntries.filter((entry) => entry.url === '/engineering/templates')
    ).toHaveLength(1)
    expect(
      engineeringPermissionTabs(translateProductHandbookNavigationLabel).some(
        (tab) => tab.href === '/engineering/product-attributes'
      )
    ).toBe(false)
    expect(getAuthenticatedRoutePaths()).not.toContain(
      '/engineering/product-attributes'
    )
    expect(
      getRouteDerivedPermissions().some(
        (permission) => permission.id === 'tab_engineering_product_attributes'
      )
    ).toBe(false)
    expect(
      resolveActiveSidebarPath(groups, productHandbookRoute)?.nodeIds
    ).toEqual(['product-handbook-group', 'product-creation-handbook'])
    expect(resolveActiveSidebarPath(groups, bomHandbookRoute)?.nodeIds).toEqual(
      ['product-handbook-group', 'bom-creation-handbook']
    )
    const configurationGroup = groups
      .find((group) => group.id === 'product-management')!
      .children.find((node) => node.id === 'product-config-group')!
    expect(checkIsActive(productHandbookRoute, configurationGroup)).toBe(false)
    expect(checkIsActive(bomHandbookRoute, configurationGroup)).toBe(false)
    expect(checkIsActive('/engineering/templates', configurationGroup)).toBe(
      true
    )
  })

  it('keeps the handbook reachable with only its existing TAB permission', () => {
    const { directories } = createProductHandbookNavigationForPermissions([
      'tab_engineering_product_creation_guide',
    ])
    const productDirectory = directories.find(
      (directory) => directory.id === 'product-management'
    )!
    expect(productDirectory.sections.map((section) => section.id)).toEqual([
      'product-handbook-group',
    ])
    expect(productDirectory.sections[0].links[0].url).toBe(productHandbookRoute)
    expect(productDirectory.sections[0].links).toHaveLength(1)
  })

  it('keeps the BOM guide reachable on its own permission, with a dedicated tab and recent visit label', () => {
    const { directories } = createProductHandbookNavigationForPermissions([
      'tab_engineering_bom_creation_guide',
    ])
    const productDirectory = directories.find(
      (directory) => directory.id === 'product-management'
    )!
    expect(productDirectory.sections.map((section) => section.id)).toEqual([
      'product-handbook-group',
    ])
    expect(productDirectory.sections[0].links).toHaveLength(1)
    expect(productDirectory.sections[0].links[0].url).toBe(bomHandbookRoute)
    expect(getAuthenticatedRoutePaths()).toContain(bomHandbookRoute)
    expect(getRouteDerivedPermissions()).toContainEqual(
      expect.objectContaining({ id: 'tab_engineering_bom_creation_guide' })
    )
    expect(
      getBOMCreationOperationGuideTabs(translateProductHandbookNavigationLabel)
    ).toEqual([
      {
        key: 'bom-creation-guide',
        label: '如何建立 BOM',
        href: bomHandbookRoute,
      },
    ])
    expect(resolveRecentVisitLabelKey(bomHandbookRoute)).toBe(
      'engineering.tabs.bomCreationGuide'
    )
  })

  it('does not expose the handbook to accounts with unrelated page permissions', () => {
    const { directories } = createProductHandbookNavigationForPermissions([
      'menu_dashboard',
    ])
    expect(
      directories.some((directory) => directory.id === 'product-management')
    ).toBe(false)
  })
})
