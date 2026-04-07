import { describe, expect, it } from 'vitest'
import { createTestRole } from '@/features/system-mgmt/test-factories'
import { createTestUser } from '../test-factories'
import { resolveOrgNodeLabel, resolveRoleLabel, resolveUserRole } from './role-resolver'
import { buildDepartmentRoleId, resolveDepartmentRoleId } from './department-role'

describe('role-resolver regression', () => {
  it('normalizes department role id construction and matching through shared helper', () => {
    expect(buildDepartmentRoleId(' Dept-1 ')).toBe('org_dept-1')
    expect(
      resolveDepartmentRoleId(
        [createTestRole({ id: 'ORG_DEPT-1', label: '财务部', color: '' })],
        'dept-1',
      ),
    ).toBe('ORG_DEPT-1')
  })

  it('prefers department role over stored role marker for employee-bound user', () => {
    const result = resolveUserRole(
      createTestUser({
        id: 'u-1',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Fin',
        phoneNumber: '123',
        role: 'legacy_role',
        employeeId: 'emp-1',
      }),
      [{ id: 'emp-1', name: 'Alice', deptId: 'dept-1' }],
      [createTestRole({ id: 'org_dept-1', label: '财务部', color: '', permissions: ['menu_org'] })],
    )

    expect(result).toEqual({
      roleId: 'org_dept-1',
      isStale: true,
      isInvalid: false,
      sourceType: 'department_role',
    })
  })

  it('marks user role invalid when employee department role is missing', () => {
    const result = resolveUserRole(
      createTestUser({
        id: 'u-2',
        username: 'bob',
        firstName: 'Bob',
        lastName: 'Ops',
        phoneNumber: '456',
        role: 'org_missing',
        employeeId: 'emp-2',
      }),
      [{ id: 'emp-2', name: 'Bob', deptId: 'dept-missing' }],
      [],
    )

    expect(result).toEqual({
      roleId: 'org_missing',
      isStale: false,
      isInvalid: true,
      sourceType: 'invalid',
    })
  })

  it('resolves org node label from org role id fallback', () => {
    const label = resolveRoleLabel(
      'org_dept-9',
      [],
      [{ id: 'dept-9', name: '销售部', children: [] }],
    )

    expect(label).toBe('销售部')
  })

  it('resolveOrgNodeLabel supports raw org id and org_ prefixed id', () => {
    const nodes = [{ id: 'dept-7', name: '采购部', children: [] }]

    expect(resolveOrgNodeLabel(nodes, 'dept-7')).toBe('采购部')
    expect(resolveOrgNodeLabel(nodes, 'org_dept-7')).toBe('采购部')
  })
})
