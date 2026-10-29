import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import { getPartRequirementsOperationGuideTabs } from '@/features/mrp/part-requirements-operation-guide-tab-config'
import { getMrpTabs } from '@/features/mrp/tabs'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { createSidebarCategoryPreviews } from './sidebar-category-scrubber-utils'
import { checkIsActive } from './sidebar-nav-utils'
import { resolveSidebarNodeTabPreviews } from './sidebar-tab-preview-registry'

const partRequirementsHandbookPath = '/mrp/requirements-guide'
const translateProductionHandbookLabel = (key: TranslationKey) =>
  translate('zh-CN', key)

function buildProductionHandbookNavigation(permissions: string[]) {
  const user = { permissions }
  const sidebar = getSidebarData(translateProductionHandbookLabel).navGroups
  const groups = getAccessibleNavGroups(user, sidebar)
  const directories = createSidebarCategoryPreviews(groups, (node) =>
    getProjectedTabsFromPermissionSnapshot(
      user,
      resolveSidebarNodeTabPreviews(node, translateProductionHandbookLabel)
    )
  )
  return { user, sidebar, groups, directories }
}

describe('production handbook navigation and route access', () => {
  it('gives guide-only readers a separate handbook, home card, and meaningful recent-visit label', () => {
    const { user, sidebar, groups, directories } =
      buildProductionHandbookNavigation(['tab_mrp_requirements_guide'])
    const production = directories.find(
      (directory) => directory.id === 'production-management'
    )!
    expect(production.sections.map((section) => section.id)).toEqual([
      'production-handbook-group',
    ])
    expect(production.sections[0].links).toMatchObject([
      {
        title: '如何分析料号需求',
        url: partRequirementsHandbookPath,
        tabs: [],
      },
    ])
    expect(
      resolveActiveSidebarPath(groups, partRequirementsHandbookPath)?.nodeIds
    ).toEqual(['production-handbook-group', 'part-requirements-handbook'])
    const home = buildHomeBusinessShortcutCategories(
      user,
      sidebar,
      translateProductionHandbookLabel
    )
    expect(
      home.find((category) => category.id === 'production-management')
        ?.shortcuts
    ).toMatchObject([
      {
        title: '如何分析料号需求',
        url: partRequirementsHandbookPath,
        description: expect.any(String),
      },
    ])
    expect(getAuthenticatedRoutePaths()).toContain(partRequirementsHandbookPath)
    expect(getRouteDerivedPermissions()).toContainEqual(
      expect.objectContaining({ id: 'tab_mrp_requirements_guide' })
    )
    expect(resolveRecentVisitLabelKey(partRequirementsHandbookPath)).toBe(
      'mrp.operationGuide.title'
    )
  })

  it('supports existing MRP access without duplicating the handbook under the planning center', () => {
    const { groups, directories } = buildProductionHandbookNavigation([
      'menu_mrp',
    ])
    const production = directories.find(
      (directory) => directory.id === 'production-management'
    )!
    const entries = production.sections.flatMap((section) =>
      section.links.flatMap((link) => (link.tabs.length ? link.tabs : [link]))
    )
    expect(
      entries.filter((entry) => entry.url === partRequirementsHandbookPath)
    ).toHaveLength(1)
    expect(entries.some((entry) => entry.url === '/mrp/requirements')).toBe(
      true
    )
    const planning = groups
      .find((group) => group.id === 'production-management')!
      .children.find((node) => node.id === 'planning-center-group')!
    expect(checkIsActive(partRequirementsHandbookPath, planning)).toBe(false)
    expect(checkIsActive('/mrp/requirements', planning)).toBe(true)
    expect(
      getMrpTabs(translateProductionHandbookLabel).map((tab) => tab.href)
    ).toEqual(['/mrp/requirements', '/mrp/production-material-issuance'])
    expect(
      getPartRequirementsOperationGuideTabs(
        translateProductionHandbookLabel
      ).map((tab) => tab.href)
    ).toEqual([partRequirementsHandbookPath])
  })

  it('does not expose the handbook with unrelated or requirements-only permission', () => {
    for (const permissions of [['menu_dashboard'], ['tab_mrp_requirements']]) {
      const { directories } = buildProductionHandbookNavigation(permissions)
      expect(
        directories
          .flatMap((directory) => directory.sections)
          .some((section) => section.id === 'production-handbook-group')
      ).toBe(false)
    }
  })
})
