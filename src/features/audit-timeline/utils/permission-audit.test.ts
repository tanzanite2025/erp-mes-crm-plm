import { describe, expect, it } from 'vitest'
import { buildPermissionLabelMap, buildUserPermissionAuditSummary } from './permission-audit'
import type { AuditLog } from '../types'

function createAuditLog(diff: AuditLog['diff']): AuditLog {
  return {
    id: 'audit-1',
    module: 'user-permission',
    target_id: 'user-1',
    action: 'REPLACE',
    diff,
    operator: 'admin',
    ip: '127.0.0.1',
    created_at: '2026-05-03T10:30:00.000Z',
  }
}

describe('permission audit utils', () => {
  it('normalizes permission labels by permission id', () => {
    const permissionLabelMap = buildPermissionLabelMap(
      [
        { id: 'ACTION_HR_DETAIL_VIEW', label: '访问：查看员工详情' },
        { id: 'menu_org', label: '访问：人事中心' },
      ],
      (label) => label.replace(/^访问：/, '').trim(),
    )

    expect(permissionLabelMap.get('action_hr_detail_view')).toBe('查看员工详情')
    expect(permissionLabelMap.get('menu_org')).toBe('人事中心')
  })

  it('builds added and removed permission summaries from audit diff items', () => {
    const log = createAuditLog([
      { f: 'beforePermissions', o: null, n: ['menu_org', 'action_hr_detail_view'], a: 'beforePermissions' },
      { f: 'afterPermissions', o: null, n: ['menu_org', 'action_finance_settlement_manage'], a: 'afterPermissions' },
      { f: 'source', o: null, n: 'manual', a: 'source' },
      { f: 'reason', o: null, n: 'users_permissions_dialog_save', a: 'reason' },
      {
        f: 'target',
        o: null,
        n: {
          id: 'user-1',
          username: 'admin',
          status: 'active',
          employeeId: 'EMP-001',
        },
        a: 'target',
      },
    ])

    const permissions = [
      { id: 'menu_org', label: '访问：人事中心' },
      { id: 'action_hr_detail_view', label: '组织人事：查看员工详情' },
      { id: 'action_finance_settlement_manage', label: '财务：登记往来结算' },
    ] as const

    const permissionLabelMap = buildPermissionLabelMap(
      permissions,
      (label) => label.replace(/^访问：/, '').trim(),
    )

    const summary = buildUserPermissionAuditSummary(log, permissionLabelMap)

    expect(permissionLabelMap.get('menu_org')).toBe('人事中心')
    expect(summary.beforePermissionIds).toEqual(['menu_org', 'action_hr_detail_view'])
    expect(summary.afterPermissionIds).toEqual(['menu_org', 'action_finance_settlement_manage'])
    expect(summary.addedPermissionItems).toEqual([
      {
        key: 'action_finance_settlement_manage',
        permissionId: 'action_finance_settlement_manage',
        label: '财务：登记往来结算',
      },
    ])
    expect(summary.removedPermissionItems).toEqual([
      {
        key: 'action_hr_detail_view',
        permissionId: 'action_hr_detail_view',
        label: '组织人事：查看员工详情',
      },
    ])
    expect(summary.afterPermissionItems).toEqual([
      {
        key: 'menu_org',
        permissionId: 'menu_org',
        label: '人事中心',
      },
      {
        key: 'action_finance_settlement_manage',
        permissionId: 'action_finance_settlement_manage',
        label: '财务：登记往来结算',
      },
    ])
    expect(summary.source).toBe('manual')
    expect(summary.reason).toBe('users_permissions_dialog_save')
    expect(summary.target).toEqual({
      id: 'user-1',
      username: 'admin',
      status: 'active',
      employeeId: 'EMP-001',
    })
  })
})
