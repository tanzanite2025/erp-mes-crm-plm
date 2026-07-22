import { describe, expect, it } from 'vitest'
import type { TabItem } from '@/components/module-tabs'
import { generatePermissionId } from '@/features/authz/data/permission-catalog'
import { getProjectedTabsFromPermissionSnapshot } from './route-access'

const financeTabs: TabItem[] = [
  {
    key: 'payment-methods',
    label: 'Payment Methods',
    href: '/finance-management/payment-methods',
    permissionId: generatePermissionId(
      'tab',
      '/finance-management/payment-methods'
    ),
  },
  {
    key: 'currency',
    label: 'Currency Rates',
    href: '/finance-management/currency-rates',
    permissionId: generatePermissionId(
      'tab',
      '/finance-management/currency-rates'
    ),
  },
]

describe('getProjectedTabsFromPermissionSnapshot', () => {
  it('keeps sibling finance tabs visible when the parent menu grants route access', () => {
    const tabs = getProjectedTabsFromPermissionSnapshot(
      { permissions: ['menu_settings'] },
      financeTabs
    )

    expect(tabs.map((tab) => tab.key)).toEqual(['payment-methods', 'currency'])
  })

  it('still supports exact tab-level visibility without the parent menu', () => {
    const tabs = getProjectedTabsFromPermissionSnapshot(
      { permissions: ['tab_finance_management_currency_rates'] },
      financeTabs
    )

    expect(tabs.map((tab) => tab.key)).toEqual(['currency'])
  })
})
