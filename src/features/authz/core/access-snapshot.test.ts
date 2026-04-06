import { describe, expect, it } from 'vitest'
import {
  getSnapshotCompatibleRoleIds,
  getSnapshotEffectiveRoleIds,
  getSnapshotPermissionIds,
} from './access-snapshot'

describe('access-snapshot regression', () => {
  it('treats effectiveRoles as the primary role source', () => {
    expect(
      getSnapshotEffectiveRoleIds({
        role: ['legacy_role'],
        effectiveRoles: ['finance_manager', 'finance_manager'],
      }),
    ).toEqual(['finance_manager'])
  })

  it('keeps legacy role field isolated from effective role primary reader when effectiveRoles is missing', () => {
    expect(getSnapshotEffectiveRoleIds({ role: ['legacy_role'] })).toEqual([])
    expect(getSnapshotCompatibleRoleIds({ role: ['legacy_role'] })).toEqual(['legacy_role'])
  })

  it('exposes a compatibility role reader that merges role and effectiveRoles for display-only consumers', () => {
    expect(
      getSnapshotCompatibleRoleIds({
        role: ['legacy_role'],
        effectiveRoles: ['finance_manager'],
      }),
    ).toEqual(['legacy_role', 'finance_manager'])
  })

  it('normalizes permission ids independently from role compatibility fields', () => {
    expect(getSnapshotPermissionIds({ permissions: ['MENU_ORG', 'permission_user_view'] })).toEqual([
      'MENU_ORG',
      'permission_user_view',
    ])
  })
})
