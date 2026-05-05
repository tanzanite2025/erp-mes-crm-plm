import type { NavGroup, NavNode } from '@/components/layout/types'
import { hasAnyId, parseRequiredIds } from '@/features/authz/core/permission-kernel'
import { getAuthSessionPermissionIds, type AuthSessionUserLike } from '@/features/authz/utils/auth-session'
import { matchesPathPermissionProjection } from './route-access'

type NavigationAccessOptions = {
  isIdentitySynced?: boolean
}

function isNonNullable<T>(value: T | null): value is T {
  return value !== null
}

function cloneNavNode(node: NavNode): NavNode {
  return {
    ...node,
    children: node.children?.map((child) => cloneNavNode(child)),
  }
}

function matchesNodePermission(
  user: AuthSessionUserLike | null | undefined,
  permissionIds: string[],
  node: NavNode,
): boolean {
  if (node.permissionId) {
    return hasAnyId(permissionIds, parseRequiredIds(node.permissionId))
  }

  if (node.url) {
    return matchesPathPermissionProjection(user, String(node.url))
  }

  return true
}

function filterNavNodeByPermission(
  user: AuthSessionUserLike | null | undefined,
  permissionIds: string[],
  node: NavNode,
): NavNode | null {
  const visibleChildren = node.children
    ?.map((child) => filterNavNodeByPermission(user, permissionIds, child))
    .filter(isNonNullable)

  const hasVisibleChildren = !!visibleChildren?.length
  const selfVisible = matchesNodePermission(user, permissionIds, node)

  if (!selfVisible && !hasVisibleChildren) {
    return null
  }

  if (!node.url && !hasVisibleChildren && !node.preserveEmptyChildren) {
    return null
  }

  return {
    ...node,
    children: hasVisibleChildren ? visibleChildren : node.children,
  }
}

export function getNonBlockingNavGroups(
  user: AuthSessionUserLike | null | undefined,
  groups: NavGroup[],
  options: NavigationAccessOptions = {},
): NavGroup[] {
  const isIdentitySynced = options.isIdentitySynced ?? true

  if (!isIdentitySynced) {
    return groups.map((group) => ({
      ...group,
      children: group.children.map((item) => cloneNavNode(item)),
    }))
  }

  const permissionIds = getAuthSessionPermissionIds(user)

  return groups.map((group) => ({
      ...group,
      children: group.children
        .map((item) => filterNavNodeByPermission(user, permissionIds, item))
        .filter(isNonNullable),
    }))
    .filter((group) => group.children.length > 0)
}
