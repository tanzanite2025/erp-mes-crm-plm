import {
  getDefaultPermissionChildrenMap,
  getDefaultPermissionOrderMap,
  getDefaultPermissionParentMap,
} from '@/features/authz/data/default-permission-queries'

const PERMISSION_ORDER_BY_ID = getDefaultPermissionOrderMap()
const PERMISSION_PARENT_BY_ID = getDefaultPermissionParentMap()
const CHILD_PERMISSION_IDS_BY_PARENT = getDefaultPermissionChildrenMap()

function toUniquePermissionIds(permissionIds: string[]): string[] {
  const cleaned = permissionIds.map((id) => id.trim()).filter(Boolean)
  return Array.from(new Set(cleaned))
}

export function sortPermissionIds(permissionIds: string[]): string[] {
  return [...permissionIds].sort((a, b) => {
    const orderA = PERMISSION_ORDER_BY_ID.get(a)
    const orderB = PERMISSION_ORDER_BY_ID.get(b)

    if (orderA !== undefined && orderB !== undefined) return orderA - orderB
    if (orderA !== undefined) return -1
    if (orderB !== undefined) return 1

    return a.localeCompare(b)
  })
}

export function collectAncestorPermissionIds(permissionId: string): string[] {
  const ancestors: string[] = []
  let current = permissionId
  const visited = new Set<string>([permissionId])

  while (true) {
    const parentId = PERMISSION_PARENT_BY_ID.get(current)
    if (!parentId || visited.has(parentId)) break

    ancestors.push(parentId)
    visited.add(parentId)
    current = parentId
  }

  return ancestors
}

export function collectDescendantPermissionIds(permissionId: string): string[] {
  const descendants: string[] = []
  const queue = [...(CHILD_PERMISSION_IDS_BY_PARENT.get(permissionId) || [])]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const nextId = queue.shift() as string
    if (visited.has(nextId)) continue
    visited.add(nextId)
    descendants.push(nextId)

    const nextChildren = CHILD_PERMISSION_IDS_BY_PARENT.get(nextId) || []
    nextChildren.forEach((childId) => queue.push(childId))
  }

  return descendants
}

export function buildTreeAssistedPermissionIds(
  currentPermissionIds: string[],
  toggledPermissionId: string,
): string[] {
  const normalizedPermissionIds = toUniquePermissionIds(currentPermissionIds)
  const nextPermissionSet = new Set(normalizedPermissionIds)
  const hasPermission = nextPermissionSet.has(toggledPermissionId)

  if (hasPermission) {
    nextPermissionSet.delete(toggledPermissionId)
    collectDescendantPermissionIds(toggledPermissionId).forEach((descendantId) => {
      nextPermissionSet.delete(descendantId)
    })
  } else {
    nextPermissionSet.add(toggledPermissionId)
    collectAncestorPermissionIds(toggledPermissionId).forEach((ancestorId) => {
      nextPermissionSet.add(ancestorId)
    })
    collectDescendantPermissionIds(toggledPermissionId).forEach((descendantId) => {
      nextPermissionSet.add(descendantId)
    })
  }

  return sortPermissionIds(Array.from(nextPermissionSet))
}
