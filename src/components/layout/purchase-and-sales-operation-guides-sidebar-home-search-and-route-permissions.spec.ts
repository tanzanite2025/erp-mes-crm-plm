import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getAuthenticatedRoutePaths } from '@/features/authz/data/authenticated-route-paths'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { buildHomeBusinessShortcutCategories } from '@/features/home/data/build-home-business-shortcut-categories'
import {
  getPurchaseOperationGuideTabs,
  getPurchaseTabs,
  PURCHASE_OPERATION_GUIDE_PATH,
} from '@/features/purchase/tabs'
import { resolveRecentVisitLabelKey } from '@/features/recent-visits/recent-visit-labels'
import {
  getSalesOperationGuideTabs,
  getTradingTabs,
  SALES_OPERATION_GUIDE_PATH,
} from '@/features/trading/tabs'
import { getSearchItems } from './data/search-data'
import { getSidebarData } from './data/sidebar-data'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { checkIsActive } from './sidebar-nav-utils'

function translatePurchaseAndSalesGuideNavigationLabel(key: TranslationKey) {
  return translate('zh-CN', key)
}

describe.each([
  {
    path: PURCHASE_OPERATION_GUIDE_PATH,
    permission: 'tab_purchase_purchase_operation_guide',
    menu: 'menu_purchase',
    businessPermission: 'tab_purchase_orders',
    businessPath: '/purchase/orders',
    title: '采购操作指南',
    labelKey: 'purchase.operationGuide.title',
    handbookNode: 'purchase-operation-handbook',
    businessNode: 'purchase-management-group',
    guideTabs: getPurchaseOperationGuideTabs,
    businessTabs: getPurchaseTabs,
  },
  {
    path: SALES_OPERATION_GUIDE_PATH,
    permission: 'tab_trading_sales_operation_guide',
    menu: 'menu_trading',
    businessPermission: 'tab_trading_sales_orders',
    businessPath: '/trading/sales-orders',
    title: '销售操作指南',
    labelKey: 'trading.operationGuide.title',
    handbookNode: 'sales-operation-handbook',
    businessNode: 'sales-management-group',
    guideTabs: getSalesOperationGuideTabs,
    businessTabs: getTradingTabs,
  },
])(
  '$title navigation',
  ({
    path,
    permission,
    menu,
    businessPermission,
    businessPath,
    title,
    labelKey,
    handbookNode,
    businessNode,
    guideTabs,
    businessTabs,
  }) => {
    it('provides independent guide-only sidebar and home access with a named route permission and recent-visit label', () => {
      const user = { permissions: [permission] }
      const sidebar = getSidebarData(
        translatePurchaseAndSalesGuideNavigationLabel
      ).navGroups
      const groups = getAccessibleNavGroups(user, sidebar)
      const purchaseAndSalesGroup = groups.find(
        (group) => group.id === 'purchase-and-sales'
      )!
      expect(purchaseAndSalesGroup.children.map((node) => node.id)).toEqual([
        'purchase-and-sales-handbook-group',
      ])
      expect(purchaseAndSalesGroup.children[0].children).toMatchObject([
        { id: handbookNode, title, url: path },
      ])
      expect(resolveActiveSidebarPath(groups, path)?.nodeIds).toEqual([
        'purchase-and-sales-handbook-group',
        handbookNode,
      ])
      const home = buildHomeBusinessShortcutCategories(
        user,
        sidebar,
        translatePurchaseAndSalesGuideNavigationLabel
      )
      expect(
        home.find((category) => category.id === 'purchase-and-sales')?.shortcuts
      ).toMatchObject([{ title, url: path, description: expect.any(String) }])
      expect(getAuthenticatedRoutePaths()).toContain(path)
      expect(
        getRouteDerivedPermissions().find((entry) => entry.id === permission)
      ).toMatchObject({
        id: permission,
        label: expect.stringContaining(title),
      })
      expect(resolveRecentVisitLabelKey(path)).toBe(labelKey)
      expect(matchesPathPermissionProjection(user, businessPath)).toBe(false)
      expect(
        guideTabs(translatePurchaseAndSalesGuideNavigationLabel).map(
          (tab) => tab.href
        )
      ).toEqual([path])
      expect(
        businessTabs(translatePurchaseAndSalesGuideNavigationLabel).map(
          (tab) => tab.href
        )
      ).not.toContain(path)
    })

    it('honors existing module access without highlighting the business group on a handbook page', () => {
      const sidebar = getSidebarData(
        translatePurchaseAndSalesGuideNavigationLabel
      ).navGroups
      const groups = getAccessibleNavGroups({ permissions: [menu] }, sidebar)
      expect(
        matchesPathPermissionProjection({ permissions: [menu] }, path)
      ).toBe(true)
      const businessGroup = groups
        .find((group) => group.id === 'purchase-and-sales')!
        .children.find((node) => node.id === businessNode)!
      expect(checkIsActive(path, businessGroup)).toBe(false)
      expect(checkIsActive(businessPath, businessGroup)).toBe(true)
      expect(resolveActiveSidebarPath(groups, path)?.nodeIds).toContain(
        handbookNode
      )
    })

    it('does not grant guide access through an unrelated or business-tab-only permission', () => {
      for (const permissions of [['menu_dashboard'], [businessPermission]]) {
        expect(matchesPathPermissionProjection({ permissions }, path)).toBe(
          false
        )
      }
    })

    it('registers one searchable destination with guide keywords', () => {
      const items = getSearchItems(
        translatePurchaseAndSalesGuideNavigationLabel
      ).filter((item) => item.href === path)
      expect(items).toHaveLength(1)
      expect(items[0]).toMatchObject({
        title,
        keywords: expect.arrayContaining([title]),
      })
      expect(
        items[0].keywords?.some((keyword) => keyword.includes('guide'))
      ).toBe(true)
    })
  }
)
