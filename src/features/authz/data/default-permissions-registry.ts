import type { Permission } from '@/features/system-mgmt/data/role-schema'
import { ACTION_PERMISSIONS } from './action-permission-catalog'
import { assertBackendPermissionContract } from './permission-contract.gen'
import { getRouteDerivedPermissions } from './route-permission-registry'

const permissionCategoryWeight: Record<Permission['category'], number> = {
  menu: 0,
  page: 1,
  tab: 2,
  action: 3,
}

export function collectDefaultPermissions(): Permission[] {
  const byId = new Map<string, Permission>()
  ;[...getRouteDerivedPermissions(), ...ACTION_PERMISSIONS].forEach((permission) => {
    byId.set(permission.id, permission)
  })

  return Array.from(byId.values()).sort((a, b) => {
    const categoryOrder = permissionCategoryWeight[a.category] - permissionCategoryWeight[b.category]
    if (categoryOrder !== 0) return categoryOrder
    return a.id.localeCompare(b.id)
  })
}

export function validateDefaultPermissionsContract(permissions: Permission[]): void {
  assertBackendPermissionContract(permissions.map((permission) => permission.id))
}
