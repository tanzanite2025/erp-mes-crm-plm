import type { Permission } from '@/features/authz/data/permission-schema'
import type {
  PermissionPageNode,
  PermissionTreeNode,
} from '@/features/authz/utils/permission-tree-types'

export function collectPagePermissionIDs(pageNode: PermissionPageNode) {
  return [pageNode.page.id, ...pageNode.tabs.map((tab) => tab.id)]
}

export function collectModulePermissionIDs(node: PermissionTreeNode) {
  return [
    node.module.id,
    ...node.pages.flatMap((pageNode) => collectPagePermissionIDs(pageNode)),
    ...node.directTabs.map((tab) => tab.id),
    ...node.directActions.map((action) => action.id),
  ]
}

function permissionMatches(permission: Permission, keyword: string) {
  return [
    permission.id,
    permission.label,
    permission.desc,
    permission.path || '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(keyword)
}

export function filterUserPermissionTree(
  nodes: PermissionTreeNode[],
  keyword: string
): PermissionTreeNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return nodes

  return nodes.flatMap((node) => {
    if (permissionMatches(node.module, normalizedKeyword)) return [node]

    const pages = node.pages.flatMap((pageNode) => {
      if (permissionMatches(pageNode.page, normalizedKeyword)) {
        return [pageNode]
      }
      const tabs = pageNode.tabs.filter((tab) =>
        permissionMatches(tab, normalizedKeyword)
      )
      return tabs.length > 0 ? [{ page: pageNode.page, tabs }] : []
    })
    const directTabs = node.directTabs.filter((tab) =>
      permissionMatches(tab, normalizedKeyword)
    )
    const directActions = node.directActions.filter((action) =>
      permissionMatches(action, normalizedKeyword)
    )

    if (
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
          pages.reduce(
            (count, pageNode) => count + 1 + pageNode.tabs.length,
            0
          ) +
          directTabs.length +
          directActions.length,
      },
    ]
  })
}

export function distributeUserPermissionTree(
  nodes: PermissionTreeNode[]
): PermissionTreeNode[][] {
  return nodes.reduce<PermissionTreeNode[][]>(
    (columns, node, index) => {
      columns[index % columns.length].push(node)
      return columns
    },
    [[], [], []]
  )
}
