import { checkIsActive } from './sidebar-nav-utils'
import type { NavGroup, NavNode } from './types'

export type ActiveSidebarPath = {
  groupId: string
  nodeIds: string[]
  key: string
}

function findActiveNodePath(
  pathname: string,
  nodes: NavNode[]
): NavNode[] | null {
  for (const node of nodes) {
    if (!checkIsActive(pathname, node)) {
      continue
    }

    const activeChildPath = node.children
      ? findActiveNodePath(pathname, node.children)
      : null

    return activeChildPath ? [node, ...activeChildPath] : [node]
  }

  return null
}

export function resolveActiveSidebarPath(
  navGroups: NavGroup[],
  pathname: string
): ActiveSidebarPath | null {
  for (const group of navGroups) {
    const activeNodePath = findActiveNodePath(pathname, group.children)

    if (!activeNodePath) {
      continue
    }

    const nodeIds = activeNodePath.map((node) => node.id)

    return {
      groupId: group.id,
      nodeIds,
      key: [group.id, ...nodeIds].join('/'),
    }
  }

  return null
}
