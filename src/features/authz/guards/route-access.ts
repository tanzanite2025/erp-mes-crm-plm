import type { TabItem } from '@/components/module-tabs'
import {
  hasAnyId,
  parseRequiredIds,
} from '@/features/authz/core/permission-kernel'
import { resolveRoutePermissionIds } from '@/features/authz/data/route-permission-queries'
import {
  getAuthSessionPermissionIds,
  type AuthSessionUserLike,
} from '@/features/authz/utils/auth-session'

type RouteAccessOptions = {
  strictTab?: boolean
}

function matchesPermissionSnapshot(
  user: AuthSessionUserLike | null | undefined,
  permissionId: string | string[]
): boolean {
  return hasAnyId(
    getAuthSessionPermissionIds(user),
    parseRequiredIds(permissionId)
  )
}

/**
 * Resolve projected permission ids for a route path.
 */
export function getProjectedPermissionIdsForPath(
  path: string,
  options: RouteAccessOptions = {}
): string[] {
  const strictTab = options.strictTab ?? false
  return resolveRoutePermissionIds(path, strictTab)
}

/**
 * Match a route path against the current permission snapshot projection.
 */
export function matchesPathPermissionProjection(
  user: AuthSessionUserLike | null | undefined,
  path: string,
  options: RouteAccessOptions = {}
): boolean {
  const requiredPermissionIds = getProjectedPermissionIdsForPath(path, options)

  if (requiredPermissionIds.length === 0) {
    return true
  }

  return requiredPermissionIds.some((permissionId) =>
    matchesPermissionSnapshot(user, permissionId)
  )
}

/**
 * Project visible tabs from the current permission snapshot.
 */
export function getProjectedTabsFromPermissionSnapshot(
  user: AuthSessionUserLike | null | undefined,
  tabs: TabItem[],
  options: RouteAccessOptions = {}
): TabItem[] {
  return tabs.filter((tab) => {
    if (tab.permissionId) {
      return matchesPermissionSnapshot(user, tab.permissionId)
    }

    return matchesPathPermissionProjection(user, tab.href, options)
  })
}
