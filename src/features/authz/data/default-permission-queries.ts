import type { Permission } from '@/features/system-mgmt/data/role-schema'
import { DEFAULT_PERMISSIONS } from './default-permissions'

const DEFAULT_PERMISSION_ORDER_BY_ID = new Map(
  DEFAULT_PERMISSIONS.map((permission, index) => [permission.id, index]),
)
const DEFAULT_KNOWN_PERMISSION_IDS = new Set(DEFAULT_PERMISSIONS.map((permission) => permission.id))
const DEFAULT_PERMISSION_PARENT_BY_ID = new Map(
  DEFAULT_PERMISSIONS
    .filter((permission) => permission.parentId)
    .map((permission) => [permission.id, permission.parentId as string]),
)
const DEFAULT_CHILD_PERMISSION_IDS_BY_PARENT = new Map<string, string[]>()

DEFAULT_PERMISSIONS.forEach((permission) => {
  if (!permission.parentId) return
  const children = DEFAULT_CHILD_PERMISSION_IDS_BY_PARENT.get(permission.parentId) || []
  children.push(permission.id)
  DEFAULT_CHILD_PERMISSION_IDS_BY_PARENT.set(permission.parentId, children)
})

export function getDefaultPermissions(): Permission[] {
  return DEFAULT_PERMISSIONS
}

export function getDefaultPermissionOrderMap(): ReadonlyMap<string, number> {
  return DEFAULT_PERMISSION_ORDER_BY_ID
}

export function getKnownDefaultPermissionIds(): ReadonlySet<string> {
  return DEFAULT_KNOWN_PERMISSION_IDS
}

export function getDefaultPermissionParentMap(): ReadonlyMap<string, string> {
  return DEFAULT_PERMISSION_PARENT_BY_ID
}

export function getDefaultPermissionChildrenMap(): ReadonlyMap<string, string[]> {
  return DEFAULT_CHILD_PERMISSION_IDS_BY_PARENT
}
