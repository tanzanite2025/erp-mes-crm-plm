import type { Permission } from '@/features/authz/data/permission-schema'

export type PermissionMatrixUI = Record<Permission['category'], Permission[]>

function createEmptyMatrix(): PermissionMatrixUI {
  return {
    menu: [],
    page: [],
    tab: [],
    action: [],
  }
}

/**
 * Group permissions by category for permission matrix rendering.
 */
export function generatePermissionMatrixUI(permissions: Permission[]): PermissionMatrixUI {
  const grouped = permissions.reduce((acc, permission) => {
    acc[permission.category].push(permission)
    return acc
  }, createEmptyMatrix())

  ;(Object.keys(grouped) as Array<Permission['category']>).forEach((category) => {
    grouped[category] = grouped[category]
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
  })

  return grouped
}
