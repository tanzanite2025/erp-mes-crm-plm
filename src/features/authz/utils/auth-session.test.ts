import { describe, expect, it } from 'vitest'
import {
  getAuthSessionCompatibleRoleIds,
  getAuthSessionEffectiveRoleIds,
  getAuthSessionPermissionIds,
} from './auth-session'

describe('auth-session compatibility regression', () => {
  it('exposes explicit compatibility role reader for display-only consumers', () => {
    expect(
      getAuthSessionCompatibleRoleIds({
        role: ['legacy_role'],
        effectiveRoles: ['finance_manager'],
      }),
    ).toEqual(['legacy_role', 'finance_manager'])
  })

  it('keeps effective role and permission readers isolated from compatibility role merge', () => {
    expect(getAuthSessionEffectiveRoleIds({ role: ['legacy_role'], effectiveRoles: ['finance_manager'] })).toEqual([
      'finance_manager',
    ])
    expect(getAuthSessionPermissionIds({ permissions: ['menu_org'] })).toEqual(['menu_org'])
  })
})
