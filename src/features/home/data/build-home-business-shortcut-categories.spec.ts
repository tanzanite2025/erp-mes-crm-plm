import { translate, type TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import { getSidebarData } from '@/components/layout/data/sidebar-data'
import type { NavGroup } from '@/components/layout/types'
import { getMenuPermissionForPath } from '@/features/authz/data/permission-catalog'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { buildHomeBusinessShortcutCategories } from './build-home-business-shortcut-categories'

const translateHomeShortcutLabel = (key: TranslationKey) =>
  translate('zh-CN', key)
const sidebarGroups = getSidebarData(translateHomeShortcutLabel).navGroups

describe('HOME business shortcuts and independent navigation domains', () => {
  it('keeps HOME available without granting dashboard or other business domains', () => {
    const user = { permissions: [] }
    expect(
      getAccessibleNavGroups(user, sidebarGroups).map((group) => group.id)
    ).toEqual(['home'])
    expect(
      buildHomeBusinessShortcutCategories(
        user,
        sidebarGroups,
        translateHomeShortcutLabel
      )
    ).toEqual([])
  })

  it('shows the dashboard as its own sidebar domain and exposes its existing tabs only when granted', () => {
    const user = { permissions: ['menu_dashboard'] }
    expect(
      getAccessibleNavGroups(user, sidebarGroups).map((group) => group.id)
    ).toEqual(['home', 'resource-management'])
    const categories = buildHomeBusinessShortcutCategories(
      user,
      sidebarGroups,
      translateHomeShortcutLabel
    )
    expect(categories.map((category) => category.id)).toEqual([
      'resource-management',
    ])
    expect(categories[0].shortcuts.map((shortcut) => shortcut.url)).toEqual([
      '/dashboard/overview',
      '/dashboard/calendar',
      '/dashboard/reports',
      '/dashboard/notifications',
    ])
  })

  it('prioritizes product records and BOM using the existing module tab routes', () => {
    const user = {
      permissions: [getMenuPermissionForPath('/engineering/products')],
    }
    const categories = buildHomeBusinessShortcutCategories(
      user,
      sidebarGroups,
      translateHomeShortcutLabel
    )
    expect(categories[0].id).toBe('product-management')
    expect(
      categories[0].shortcuts.slice(0, 2).map((shortcut) => shortcut.url)
    ).toEqual(['/engineering/products', '/product-structure/bom'])
    expect(
      categories.some((category) => category.id === 'resource-management')
    ).toBe(false)
    expect(
      categories
        .flatMap((category) => category.shortcuts)
        .some((shortcut) => shortcut.url === '/home')
    ).toBe(false)
  })

  it('deduplicates shared destinations and removes domains that the account cannot access', () => {
    const navGroups: NavGroup[] = [
      {
        id: 'product-management',
        title: 'Products',
        children: [
          {
            id: 'first-product-link',
            title: 'Product records',
            url: '/engineering/products',
          },
          {
            id: 'duplicate-product-link',
            title: 'Same records',
            url: '/engineering/products',
          },
          {
            id: 'restricted-dashboard-link',
            title: 'Factory overview',
            url: '/dashboard/overview',
          },
        ],
      },
    ]
    const categories = buildHomeBusinessShortcutCategories(
      { permissions: ['menu_engineering'] },
      navGroups,
      translateHomeShortcutLabel
    )
    expect(categories[0].shortcuts.map((shortcut) => shortcut.url)).toEqual([
      '/engineering/products',
    ])
  })
})
