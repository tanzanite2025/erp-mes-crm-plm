import type { Permission } from '@/features/authz/data/permission-schema'
import { collectDefaultPermissions, validateDefaultPermissionsContract } from './default-permissions'

function getValidatedDefaultPermissions(): Permission[] {
  const permissions = collectDefaultPermissions()
  validateDefaultPermissionsContract(permissions)
  return permissions
}

export function getDefaultPermissions(): Permission[] {
  return getValidatedDefaultPermissions()
}

export function getDefaultPermissionOrderMap(): ReadonlyMap<string, number> {
  return new Map(getValidatedDefaultPermissions().map((permission, index) => [permission.id, index]))
}

export function getKnownDefaultPermissionIds(): ReadonlySet<string> {
  return new Set(getValidatedDefaultPermissions().map((permission) => permission.id))
}

export function getDefaultPermissionParentMap(): ReadonlyMap<string, string> {
  return new Map(
    getValidatedDefaultPermissions()
      .filter((permission) => permission.parentId)
      .map((permission) => [permission.id, permission.parentId as string]),
  )
}

export function getDefaultPermissionChildrenMap(): ReadonlyMap<string, string[]> {
  const childPermissionIdsByParent = new Map<string, string[]>()

  getValidatedDefaultPermissions().forEach((permission) => {
    if (!permission.parentId) return
    const children = childPermissionIdsByParent.get(permission.parentId) || []
    children.push(permission.id)
    childPermissionIdsByParent.set(permission.parentId, children)
  })

  return childPermissionIdsByParent
}
