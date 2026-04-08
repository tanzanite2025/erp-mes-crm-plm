import type { Permission } from '@/features/system-mgmt/data/role-schema'
import type { PermissionPageNode, PermissionTreeNode } from './user-rights-types'

/**
 * [UI-SIDE-RECONSTRUCTION] 前端权限树重组工具
 * 
 * ⚠️ 性能警示：
 * 当权限条目 > 500 条时，前端递归重组会产生可感知的渲染延迟。
 * 建议后续迁移至后端接口：/permissions/tree 直接返回已分层的结构。
 */

export function buildPermissionTreeNodes(
  permissions: ReadonlyArray<Permission>,
): PermissionTreeNode[] {
  // 1. [OPTIMIZATION] 单次遍历预分类，避免 O(N*M) 的多次 filter
  const byParentId = new Map<string, Permission[]>()
  const byCategory = new Map<string, Permission[]>()
  
  permissions.forEach((p) => {
    // 按父级分类
    if (p.parentId) {
      const children = byParentId.get(p.parentId) || []
      children.push(p)
      byParentId.set(p.parentId, children)
    }
    // 按类别分类
    const list = byCategory.get(p.category) || []
    list.push(p)
    byCategory.set(p.category, list)
  })

  // 2. 递归构建
  const menuPermissions = byCategory.get('menu') || []
  
  return menuPermissions.map((modulePermission) => {
    const directChildren = byParentId.get(modulePermission.id) || []
    
    // 提取页面级节点
    const pages = directChildren.filter((p) => p.category === 'page')
    const pageNodes: PermissionPageNode[] = pages.map(pagePermission => ({
      page: pagePermission,
      tabs: (byParentId.get(pagePermission.id) || []).filter(p => p.category === 'tab')
    }))

    const directTabs = directChildren.filter((p) => p.category === 'tab')
    const directActions = directChildren.filter((p) => p.category === 'action')

    // [CALCULATION] 计算子节点总数用于 UI 统计
    const childNodeCount = 
      pages.length + 
      pageNodes.reduce((sum, pn) => sum + pn.tabs.length, 0) + 
      directTabs.length + 
      directActions.length

    return {
      module: modulePermission,
      pages: pageNodes,
      directTabs,
      directActions,
      childNodeCount,
    }
  })
}
