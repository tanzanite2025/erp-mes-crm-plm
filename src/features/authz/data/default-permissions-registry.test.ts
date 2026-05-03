import { describe, expect, it } from 'vitest'
import { collectDefaultPermissions, validateDefaultPermissionsContract } from './default-permissions-registry'

describe('default permission registry', () => {
  it('stays aligned with backend managed action permissions used by personnel rights dialog', () => {
    const permissions = collectDefaultPermissions()
    const permissionIds = new Set(permissions.map((permission) => permission.id))

    expect(permissionIds.has('action_finance_settlement_manage')).toBe(true)
    expect(permissionIds.has('action_hr_detail_view')).toBe(true)
    expect(permissionIds.has('action_production_issuance_execute')).toBe(true)
    expect(permissionIds.has('action_barcode_binding_manage')).toBe(true)
    expect(() => validateDefaultPermissionsContract(permissions)).not.toThrow()
  })
})
