import type {
  OrgRoleOption,
  PermissionTreeNode,
  UserRightsOrgNode,
  UserRightsPermission,
} from './user-rights-types'
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

export function flattenOrgRoleOptions(
  nodes: UserRightsOrgNode[],
  importedRoleIds: string[] = [],
  activeRoleIds?: Set<string>,
): OrgRoleOption[] {
  const items: OrgRoleOption[] = []
  const importedSet = new Set(importedRoleIds.map((item) => item.trim().toLowerCase()))

  const walk = (list: UserRightsOrgNode[], lineage: string[] = []) => {
    list.forEach((node) => {
      const nextLineage = [...lineage, node.name]
      if (node.type === 'department') {
        const roleId = `org_${node.id}`
        const normalizedId = roleId.toLowerCase()
        const isImported = importedSet.has(normalizedId)
        const isActive = activeRoleIds?.has(normalizedId)

        items.push({
          label: `${isActive ? '● ' : ''}${nextLineage.join(' / ')}${isImported ? ' (已存在)' : ''}`,
          value: `${roleId}|${node.name}`,
          disabled: isImported,
        })
      }
      if (node.children) walk(node.children, nextLineage)
    })
  }

  walk(nodes)
  return items
}
