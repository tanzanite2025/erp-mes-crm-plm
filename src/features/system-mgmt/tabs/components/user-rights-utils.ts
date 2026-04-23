import type { UserOption } from '@/features/users/data/schema'
import type { PermissionTreeNode, UserRightsPermission, UserRoleOption } from './user-rights-types'
import { buildPermissionTreeNodes } from './permission-tree-utils'

export function buildPermissionTree(permissions: UserRightsPermission[]): PermissionTreeNode[] {
  return buildPermissionTreeNodes(permissions)
}

export function formatPermissionLabel(label: string) {
  return label
    .replace(/\uFF1A/g, ':')
    .replace(/^(?:TAB|PAGE)\s*[:/]\s*/i, '')
    .replace(/^\u9875\u9762\s*[:/]\s*/, '')
    .replace(/^\u8bbf\u95ee\s*[:/]\s*/, '')
    .replace(/^\/+/, '')
    .trim()
}

export function buildAccountRoleOptions(
  users: UserOption[],
  importedRoleIds: string[] = [],
): UserRoleOption[] {
  const importedSet = new Set(importedRoleIds.map((item) => item.trim().toLowerCase()))
  const roleMap = new Map<string, string>()

  users.forEach((user) => {
    const role = user.role?.trim()
    if (!role) return
    const normalizedRole = role.toLowerCase()
    if (!roleMap.has(normalizedRole)) {
      roleMap.set(normalizedRole, role)
    }
  })

  return Array.from(roleMap.entries())
    .sort((left, right) => left[1].localeCompare(right[1]))
    .map(([normalizedRole, role]) => ({
      label: role,
      value: role,
      disabled: importedSet.has(normalizedRole),
    }))
}
