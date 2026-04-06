import type { Permission } from '@/features/system-mgmt/data/role-schema'
import type { PermissionPageNode, PermissionTreeNode } from './user-rights-types'

export function groupPermissionsByParent(
  permissions: ReadonlyArray<Permission>,
): Map<string, Permission[]> {
  const byParentId = new Map<string, Permission[]>()

  permissions.forEach((permission) => {
    if (!permission.parentId) return
    const children = byParentId.get(permission.parentId) || []
    children.push(permission)
    byParentId.set(permission.parentId, children)
  })

  return byParentId
}

export function buildPermissionPageNodes(
  pagePermissions: ReadonlyArray<Permission>,
  permissionsByParent: ReadonlyMap<string, Permission[]>,
): PermissionPageNode[] {
  return pagePermissions.map((pagePermission) => ({
    page: pagePermission,
    tabs: (permissionsByParent.get(pagePermission.id) || []).filter(
      (permission) => permission.category === 'tab',
    ),
  }))
}

export function buildPermissionTreeNodes(
  permissions: ReadonlyArray<Permission>,
): PermissionTreeNode[] {
  const byParentId = groupPermissionsByParent(permissions)

  return permissions
    .filter((permission) => permission.category === 'menu')
    .map((modulePermission) => {
      const directChildren = byParentId.get(modulePermission.id) || []
      const pages = directChildren.filter((permission) => permission.category === 'page')
      const directTabs = directChildren.filter((permission) => permission.category === 'tab')
      const directActions = directChildren.filter((permission) => permission.category === 'action')
      const pageNodes = buildPermissionPageNodes(pages, byParentId)

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
