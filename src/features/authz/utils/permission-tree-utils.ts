import type { Permission } from '@/features/authz/data/permission-schema'
import type { PermissionPageNode, PermissionTreeNode } from './permission-tree-types'

export function buildPermissionTreeNodes(
  permissions: ReadonlyArray<Permission>,
): PermissionTreeNode[] {
  const byParentId = new Map<string, Permission[]>()
  const byCategory = new Map<string, Permission[]>()

  permissions.forEach((permission) => {
    if (permission.parentId) {
      const children = byParentId.get(permission.parentId) || []
      children.push(permission)
      byParentId.set(permission.parentId, children)
    }

    const list = byCategory.get(permission.category) || []
    list.push(permission)
    byCategory.set(permission.category, list)
  })

  const menuPermissions = byCategory.get('menu') || []

  return menuPermissions.map((modulePermission) => {
    const directChildren = byParentId.get(modulePermission.id) || []
    const pages = directChildren.filter((permission) => permission.category === 'page')
    const pageNodes: PermissionPageNode[] = pages.map((pagePermission) => ({
      page: pagePermission,
      tabs: (byParentId.get(pagePermission.id) || []).filter((permission) => permission.category === 'tab'),
    }))
    const directTabs = directChildren.filter((permission) => permission.category === 'tab')
    const directActions = directChildren.filter((permission) => permission.category === 'action')

    return {
      module: modulePermission,
      pages: pageNodes,
      directTabs,
      directActions,
      childNodeCount:
        pages.length +
        pageNodes.reduce((sum, pageNode) => sum + pageNode.tabs.length, 0) +
        directTabs.length +
        directActions.length,
    }
  })
}

export function buildPermissionTree(permissions: Permission[]): PermissionTreeNode[] {
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
