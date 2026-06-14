import {
  getDefaultPermissionChildrenMap,
  getDefaultPermissionOrderMap,
  getDefaultPermissionParentMap,
} from '@/features/authz/data/default-permission-queries'
import type { Permission } from '@/features/authz/data/permission-schema'

export type PermissionPageNode = {
  page: Permission
  tabs: Permission[]
}

export type PermissionTreeNode = {
  module: Permission
  pages: PermissionPageNode[]
  directTabs: Permission[]
  directActions: Permission[]
  childNodeCount: number
}

function toUniquePermissionIds(permissionIds: string[]): string[] {
  const cleaned = permissionIds.map((id) => id.trim()).filter(Boolean)
  return Array.from(new Set(cleaned))
}

export function sortPermissionIds(permissionIds: string[]): string[] {
  const permissionOrderById = getDefaultPermissionOrderMap()

  return [...permissionIds].sort((a, b) => {
    const orderA = permissionOrderById.get(a)
    const orderB = permissionOrderById.get(b)

    if (orderA !== undefined && orderB !== undefined) return orderA - orderB
    if (orderA !== undefined) return -1
    if (orderB !== undefined) return 1

    return a.localeCompare(b)
  })
}

export function collectAncestorPermissionIds(permissionId: string): string[] {
  const permissionParentById = getDefaultPermissionParentMap()
  const ancestors: string[] = []
  let current = permissionId
  const visited = new Set<string>([permissionId])

  while (true) {
    const parentId = permissionParentById.get(current)
    if (!parentId || visited.has(parentId)) break

    ancestors.push(parentId)
    visited.add(parentId)
    current = parentId
  }

  return ancestors
}

export function collectDescendantPermissionIds(permissionId: string): string[] {
  const childPermissionIdsByParent = getDefaultPermissionChildrenMap()
  const descendants: string[] = []
  const queue = [...(childPermissionIdsByParent.get(permissionId) || [])]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const nextId = queue.shift() as string
    if (visited.has(nextId)) continue
    visited.add(nextId)
    descendants.push(nextId)

    const nextChildren = childPermissionIdsByParent.get(nextId) || []
    nextChildren.forEach((childId) => queue.push(childId))
  }

  return descendants
}

export function buildTreeAssistedPermissionIds(
  currentPermissionIds: string[],
  toggledPermissionId: string
): string[] {
  const normalizedPermissionIds = toUniquePermissionIds(currentPermissionIds)
  const nextPermissionSet = new Set(normalizedPermissionIds)
  const hasPermission = nextPermissionSet.has(toggledPermissionId)

  if (hasPermission) {
    nextPermissionSet.delete(toggledPermissionId)
    collectDescendantPermissionIds(toggledPermissionId).forEach(
      (descendantId) => {
        nextPermissionSet.delete(descendantId)
      }
    )
  } else {
    nextPermissionSet.add(toggledPermissionId)
    collectAncestorPermissionIds(toggledPermissionId).forEach((ancestorId) => {
      nextPermissionSet.add(ancestorId)
    })
    collectDescendantPermissionIds(toggledPermissionId).forEach(
      (descendantId) => {
        nextPermissionSet.add(descendantId)
      }
    )
  }

  return sortPermissionIds(Array.from(nextPermissionSet))
}

export function buildPermissionTreeNodes(
  permissions: ReadonlyArray<Permission>
): PermissionTreeNode[] {
  const byParentId = new Map<string, Permission[]>()
  const byCategory = new Map<string, Permission[]>()

  permissions.forEach((permission) => {
    if (permission.parentId) {
      const children = byParentId.get(permission.parentId) || []
      children.push(permission)
      byParentId.set(permission.parentId, children)
    }

    const categoryList = byCategory.get(permission.category) || []
    categoryList.push(permission)
    byCategory.set(permission.category, categoryList)
  })

  const menuPermissions = byCategory.get('menu') || []

  return menuPermissions.map((modulePermission) => {
    const directChildren = byParentId.get(modulePermission.id) || []
    const pages = directChildren.filter(
      (permission) => permission.category === 'page'
    )
    const pageNodes: PermissionPageNode[] = pages.map((pagePermission) => ({
      page: pagePermission,
      tabs: (byParentId.get(pagePermission.id) || []).filter(
        (permission) => permission.category === 'tab'
      ),
    }))

    const directTabs = directChildren.filter(
      (permission) => permission.category === 'tab'
    )
    const directActions = directChildren.filter(
      (permission) => permission.category === 'action'
    )

    return {
      module: modulePermission,
      pages: pageNodes,
      directTabs,
      directActions,
      childNodeCount:
        pages.length +
        pageNodes.reduce((total, pageNode) => total + pageNode.tabs.length, 0) +
        directTabs.length +
        directActions.length,
    }
  })
}

export function filterPermissionTreeNodesBySelected(
  nodes: ReadonlyArray<PermissionTreeNode>,
  selectedPermissionIds: ReadonlySet<string>
): PermissionTreeNode[] {
  return nodes.flatMap((node) => {
    const moduleSelected = selectedPermissionIds.has(
      node.module.id.toLowerCase()
    )
    const pages = node.pages.flatMap((pageNode) => {
      const selectedTabs = pageNode.tabs.filter((tab) =>
        selectedPermissionIds.has(tab.id.toLowerCase())
      )
      if (
        selectedPermissionIds.has(pageNode.page.id.toLowerCase()) ||
        selectedTabs.length > 0
      ) {
        return [
          {
            page: pageNode.page,
            tabs: selectedTabs,
          },
        ]
      }
      return []
    })

    const directTabs = node.directTabs.filter((tab) =>
      selectedPermissionIds.has(tab.id.toLowerCase())
    )
    const directActions = node.directActions.filter((action) =>
      selectedPermissionIds.has(action.id.toLowerCase())
    )

    if (
      !moduleSelected &&
      pages.length === 0 &&
      directTabs.length === 0 &&
      directActions.length === 0
    ) {
      return []
    }

    return [
      {
        module: node.module,
        pages,
        directTabs,
        directActions,
        childNodeCount:
          pages.length +
          pages.reduce((total, pageNode) => total + pageNode.tabs.length, 0) +
          directTabs.length +
          directActions.length,
      },
    ]
  })
}
