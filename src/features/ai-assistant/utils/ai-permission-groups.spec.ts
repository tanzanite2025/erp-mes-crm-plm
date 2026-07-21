import { describe, expect, it } from 'vitest'
import type { Permission } from '@/features/authz/data/permission-schema'
import { getRouteDerivedPermissions } from '@/features/authz/data/route-permission-registry'
import {
  buildAiPermissionGroups,
  filterAiPermissionGroups,
  getAiRoutePermissionIds,
  isAiRoutePermissionAllowed,
  togglePermissionSelection,
} from './ai-permission-groups'

const permissions: Permission[] = [
  {
    id: 'menu_sales',
    label: '销售管理',
    desc: '销售模块',
    category: 'menu',
    path: '/sales',
  },
  {
    id: 'page_sales',
    label: '页面：销售首页',
    desc: '销售首页',
    category: 'page',
    parentId: 'menu_sales',
    path: '/sales',
  },
  {
    id: 'tab_sales_orders',
    label: 'TAB：销售订单',
    desc: '销售订单页面',
    category: 'tab',
    parentId: 'page_sales',
    path: '/sales/orders',
  },
  {
    id: 'action_order_create',
    label: '创建订单',
    desc: '创建销售订单',
    category: 'action',
    parentId: 'menu_sales',
  },
]

describe('AI permission groups', () => {
  it('keeps one selectable permission per route page', () => {
    const groups = buildAiPermissionGroups(permissions, [
      'page_sales',
      'tab_sales_orders',
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0].id).toBe('menu_sales')
    expect(groups[0].permissions).toEqual([permissions[1], permissions[2]])
    expect(groups[0].permissionIds).toEqual(['page_sales', 'tab_sales_orders'])
  })

  it('keeps the module while filtering its visible route rows', () => {
    const groups = buildAiPermissionGroups(permissions, [
      'page_sales',
      'tab_sales_orders',
    ])
    const filtered = filterAiPermissionGroups(groups, '销售订单')

    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('menu_sales')
    expect(filtered[0].permissions).toEqual([permissions[2]])
    expect(filtered[0].permissionIds).toEqual(groups[0].permissionIds)
  })

  it('includes every route page permission exactly once', () => {
    const routePermissions = getRouteDerivedPermissions()
    const aiRoutePermissionIds = getAiRoutePermissionIds()
    const groups = buildAiPermissionGroups(
      routePermissions,
      aiRoutePermissionIds
    )
    const groupedPermissionIds = groups
      .flatMap((group) => group.permissionIds)
      .sort()

    expect(groupedPermissionIds).toEqual([...aiRoutePermissionIds].sort())
    expect(aiRoutePermissionIds.some((id) => id.startsWith('menu_'))).toBe(
      false
    )
    expect(
      groups
        .flatMap((group) => group.permissions)
        .some((permission) => permission.category === 'action')
    ).toBe(false)
  })

  it('checks AI access against the current route page only', () => {
    expect(
      isAiRoutePermissionAllowed('/system-management/ai-capability', [
        'TAB_SYSTEM_MANAGEMENT_AI_CAPABILITY',
      ])
    ).toBe(true)
    expect(isAiRoutePermissionAllowed('/dashboard', ['menu_dashboard'])).toBe(
      false
    )
    expect(
      isAiRoutePermissionAllowed('/system-management/audit-engine', [
        'tab_system_management_ai_capability',
      ])
    ).toBe(false)
  })

  it('selects or clears a group without dropping unrelated route IDs', () => {
    const selected = togglePermissionSelection(
      ['tab_other_page', 'PAGE_SALES'],
      ['page_sales', 'tab_sales_orders']
    )

    expect(selected).toEqual([
      'tab_other_page',
      'PAGE_SALES',
      'tab_sales_orders',
    ])
    expect(
      togglePermissionSelection(selected, ['page_sales', 'tab_sales_orders'])
    ).toEqual(['tab_other_page'])
  })
})
