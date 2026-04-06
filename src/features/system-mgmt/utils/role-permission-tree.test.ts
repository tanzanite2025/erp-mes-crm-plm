import { describe, expect, it } from 'vitest'
import {
  buildTreeAssistedPermissionIds,
  collectAncestorPermissionIds,
  collectDescendantPermissionIds,
} from './role-permission-tree'

describe('role-permission-tree regression', () => {
  it('collects permission ancestors for display tree assistance only', () => {
    expect(collectAncestorPermissionIds('tab_dashboard_overview')).toEqual(['menu_dashboard'])
  })

  it('collects permission descendants for display tree assistance only', () => {
    const descendants = collectDescendantPermissionIds('menu_dashboard')
    expect(descendants).toContain('tab_dashboard_overview')
    expect(descendants).toContain('tab_dashboard_reports')
    expect(descendants).toContain('tab_dashboard_calendar')
  })

  it('builds explicit tree-assisted payload without mutating loaded backend contract up front', () => {
    expect(buildTreeAssistedPermissionIds([], 'tab_dashboard_overview')).toEqual([
      'menu_dashboard',
      'tab_dashboard_overview',
    ])

    expect(
      buildTreeAssistedPermissionIds(
        ['menu_dashboard', 'tab_dashboard_overview', 'tab_dashboard_reports'],
        'tab_dashboard_overview',
      ),
    ).toEqual(['menu_dashboard', 'tab_dashboard_reports'])
  })
})
