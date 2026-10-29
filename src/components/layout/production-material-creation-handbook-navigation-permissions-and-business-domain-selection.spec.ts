import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import { PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH } from '@/features/material-archive/production-material-creation-operation-guide-tab-config'
import { getMaterialRouteTabs } from '@/features/material-archive/tab-config'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getSearchItems } from './data/search-data'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { createSidebarCategoryPreviews } from './sidebar-category-scrubber-utils'
import { checkIsActive } from './sidebar-nav-utils'
import { resolveSidebarNodeTabPreviews } from './sidebar-tab-preview-registry'

const translateProductionMaterialHandbookLabel = (key: TranslationKey) =>
  translate('zh-CN', key)

describe('production material handbook navigation and existing business access', () => {
  it('offers a dedicated handbook, home shortcut, search destination, and label to guide-only readers', () => {
    const user = {
      permissions: ['tab_materials_production_material_creation_guide'],
    }
    const sidebar = getSidebarData(
      translateProductionMaterialHandbookLabel
    ).navGroups
    const groups = getAccessibleNavGroups(user, sidebar)
    const directories = createSidebarCategoryPreviews(groups, (node) =>
      getProjectedTabsFromPermissionSnapshot(
        user,
        resolveSidebarNodeTabPreviews(
          node,
          translateProductionMaterialHandbookLabel
        )
      )
    )
    const warehouseDirectory = directories.find(
      (category) => category.id === 'warehouse-logistics'
    )!
    expect(warehouseDirectory.sections.map((section) => section.id)).toEqual([
      'warehouse-logistics-handbook-group',
    ])
    expect(warehouseDirectory.sections[0].links).toMatchObject([
      {
        title: '如何建立生产物料档案',
        url: PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH,
        tabs: [],
      },
    ])
    expect(
      resolveActiveSidebarPath(
        groups,
        PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
      )?.nodeIds
    ).toEqual([
      'warehouse-logistics-handbook-group',
      'production-material-creation-handbook',
    ])
    const home = buildHomeBusinessShortcutCategories(
      user,
      sidebar,
      translateProductionMaterialHandbookLabel
    )
    expect(
      home.find((category) => category.id === 'warehouse-logistics')?.shortcuts
    ).toMatchObject([
      {
        title: '如何建立生产物料档案',
        url: PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH,
        description: expect.any(String),
      },
    ])
    expect(
      getSearchItems(translateProductionMaterialHandbookLabel).filter(
        (item) =>
          item.href === PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
      )
    ).toHaveLength(1)
    expect(getAuthenticatedRoutePaths()).toContain(
      PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
    )
    expect(getRouteDerivedPermissions()).toContainEqual(
      expect.objectContaining({
        id: 'tab_materials_production_material_creation_guide',
      })
    )
    expect(
      resolveRecentVisitLabelKey(
        PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
      )
    ).toBe('materialArchive.operationGuide.title')
  })

  it('selects the handbook independently while all material category routes stay in the business domain', () => {
    const groups = getAccessibleNavGroups(
      { permissions: ['menu_engineering'] },
      getSidebarData(translateProductionMaterialHandbookLabel).navGroups
    )
    const warehouse = groups.find(
      (group) => group.id === 'warehouse-logistics'
    )!
    const business = warehouse.children.find(
      (node) => node.id === 'warehouse-management-group'
    )!
    expect(
      checkIsActive(PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH, business)
    ).toBe(false)
    for (const tab of getMaterialRouteTabs(
      'zh-CN',
      translateProductionMaterialHandbookLabel
    )) {
      expect(checkIsActive(tab.href, business)).toBe(true)
      expect(resolveActiveSidebarPath(groups, tab.href)?.nodeIds).toEqual([
        'warehouse-management-group',
        'material-archive',
      ])
    }
    expect(
      getMaterialRouteTabs(
        'zh-CN',
        translateProductionMaterialHandbookLabel
      ).some(
        (tab) => tab.href === PRODUCTION_MATERIAL_CREATION_OPERATION_GUIDE_PATH
      )
    ).toBe(false)
  })

  it('does not grant the handbook through unrelated or material-list-only permissions', () => {
    for (const permissions of [
      ['menu_dashboard'],
      ['tab_materials__category'],
    ]) {
      const groups = getAccessibleNavGroups(
        { permissions },
        getSidebarData(translateProductionMaterialHandbookLabel).navGroups
      )
      expect(
        groups
          .flatMap((group) => group.children)
          .some((node) => node.id === 'warehouse-logistics-handbook-group')
      ).toBe(false)
    }
  })
})
