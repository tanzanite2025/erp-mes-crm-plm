import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import {
  getProjectedTabsFromPermissionSnapshot,
  matchesPathPermissionProjection,
} from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import { productionOutsourcingOperationGuideDefinitions } from '@/features/production-outsourcing/data/production-outsourcing-operation-guide-chapter-definitions'
import { getProductionOutsourcingTabs } from '@/features/production-outsourcing/tabs'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import { getSearchItems } from './data/search-data'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { checkIsActive } from './sidebar-nav-utils'

const outsourceTaskGuidePath =
  productionOutsourcingOperationGuideDefinitions.tasksAndPartners.path
const outsourceScanningGuidePath =
  productionOutsourcingOperationGuideDefinitions.sendReturnInspection.path
const translateOutsourcingHandbookLabel = (key: TranslationKey) =>
  translate('zh-CN', key)

describe('outsourcing guides in the production handbook', () => {
  it.each([
    [
      outsourceTaskGuidePath,
      'tab_production_outsourcing_task_and_partner_operation_guide',
      'tasksAndPartners',
      'production-outsourcing-task-and-partner-handbook',
    ],
    [
      outsourceScanningGuidePath,
      'tab_production_outsourcing_send_return_inspection_scanning_guide',
      'sendReturnInspection',
      'production-outsourcing-send-return-inspection-handbook',
    ],
  ] as const)(
    'provides %s independently without exposing business pages',
    (path, permission, kind, nodeId) => {
      const user = { permissions: [permission] }
      const sidebar = getSidebarData(
        translateOutsourcingHandbookLabel
      ).navGroups
      const accessible = getAccessibleNavGroups(user, sidebar)
      const production = accessible.find(
        (group) => group.id === 'production-management'
      )!
      expect(production.children.map((node) => node.id)).toEqual([
        'production-handbook-group',
      ])
      expect(production.children[0].children?.map((node) => node.url)).toEqual([
        path,
      ])
      expect(resolveActiveSidebarPath(accessible, path)?.nodeIds).toEqual([
        'production-handbook-group',
        nodeId,
      ])
      expect(
        matchesPathPermissionProjection(user, '/production-outsourcing')
      ).toBe(true)
      expect(matchesPathPermissionProjection(user, path)).toBe(true)
      expect(
        getProjectedTabsFromPermissionSnapshot(
          user,
          getProductionOutsourcingTabs(translateOutsourcingHandbookLabel)
        )
      ).toEqual([])
      const home = buildHomeBusinessShortcutCategories(
        user,
        sidebar,
        translateOutsourcingHandbookLabel
      )
      const shortcuts = home.flatMap((category) => category.shortcuts)
      expect(shortcuts).toHaveLength(1)
      expect(shortcuts[0]).toMatchObject({
        url: path,
        description: translateOutsourcingHandbookLabel(
          `productionOutsourcing.operationGuides.${kind}.shortcutDescription`
        ),
      })
      const searchEntries = getSearchItems(
        translateOutsourcingHandbookLabel
      ).filter((entry) => entry.href === path)
      expect(searchEntries).toHaveLength(1)
      expect(searchEntries[0].keywords?.join(' ')).toMatch(
        kind === 'tasksAndPartners' ? /建单/ : /条码登记/
      )
      expect(resolveRecentVisitLabelKey(path)).toBe(
        `productionOutsourcing.operationGuides.${kind}.title`
      )
      expect(getAuthenticatedRoutePaths()).toContain(path)
      expect(getRouteDerivedPermissions()).toContainEqual(
        expect.objectContaining({ id: permission })
      )
    }
  )

  it('allows existing business readers to open their relevant guide without crossing tab boundaries', () => {
    for (const permission of [
      'tab_production_outsourcing_orders',
      'tab_production_outsourcing_partners',
    ]) {
      const user = { permissions: [permission] }
      expect(
        matchesPathPermissionProjection(user, outsourceTaskGuidePath)
      ).toBe(true)
      expect(
        matchesPathPermissionProjection(user, outsourceScanningGuidePath)
      ).toBe(false)
    }
    const transferReader = {
      permissions: ['tab_production_outsourcing_transfers'],
    }
    expect(
      matchesPathPermissionProjection(
        transferReader,
        outsourceScanningGuidePath
      )
    ).toBe(true)
    expect(
      matchesPathPermissionProjection(transferReader, outsourceTaskGuidePath)
    ).toBe(false)
    expect(
      getProjectedTabsFromPermissionSnapshot(
        transferReader,
        getProductionOutsourcingTabs(translateOutsourcingHandbookLabel)
      ).map((tab) => tab.href)
    ).toEqual(['/production-outsourcing/transfers'])
    expect(
      matchesPathPermissionProjection(
        { permissions: ['menu_dashboard'] },
        outsourceTaskGuidePath
      )
    ).toBe(false)
    expect(
      matchesPathPermissionProjection(
        { permissions: ['menu_dashboard'] },
        outsourceScanningGuidePath
      )
    ).toBe(false)
  })

  it('keeps exactly three business tabs and activates only the handbook for guide paths', () => {
    const sidebar = getSidebarData(translateOutsourcingHandbookLabel).navGroups
    const production = sidebar.find(
      (group) => group.id === 'production-management'
    )!
    const coordination = production.children.find(
      (node) => node.id === 'production-coordination-group'
    )!
    const business = coordination.children!.find(
      (node) => node.id === 'production-outsourcing'
    )!
    const handbook = production.children.find(
      (node) => node.id === 'production-handbook-group'
    )!
    for (const path of [outsourceTaskGuidePath, outsourceScanningGuidePath]) {
      expect(checkIsActive(path, business)).toBe(false)
      expect(checkIsActive(path, handbook)).toBe(true)
    }
    expect(checkIsActive('/production-outsourcing/transfers', business)).toBe(
      true
    )
    expect(
      getProductionOutsourcingTabs(translateOutsourcingHandbookLabel).map(
        (tab) => tab.href
      )
    ).toEqual([
      '/production-outsourcing/orders',
      '/production-outsourcing/partners',
      '/production-outsourcing/transfers',
    ])
  })
})
