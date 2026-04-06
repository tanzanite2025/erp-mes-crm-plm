import type { RoutePermissionEntry } from './route-permissions-generator'
import { ROUTE_PERMISSION_ENTRIES } from './route-permission-registry'

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+$/g, '').replace(/\/+/g, '/')
  return normalized || '/'
}

function splitPath(path: string): string[] {
  return normalizePath(path).split('/').filter(Boolean)
}

export function matchesRoutePermissionPattern(targetPath: string, routePattern: string): boolean {
  const targetSegments = splitPath(targetPath)
  const patternSegments = splitPath(routePattern)

  if (targetSegments.length !== patternSegments.length) {
    return false
  }

  return patternSegments.every((segment, index) => {
    if (segment.startsWith(':')) {
      return targetSegments[index].length > 0
    }

    return segment === targetSegments[index]
  })
}

export function findRoutePermissionEntry(path: string): RoutePermissionEntry | undefined {
  const normalizedPath = normalizePath(path)
  return ROUTE_PERMISSION_ENTRIES.find((entry) => matchesRoutePermissionPattern(normalizedPath, entry.path))
}

export function resolveRoutePermissionIds(path: string, strictTab = false): string[] {
  const routeEntry = findRoutePermissionEntry(path)
  if (!routeEntry) {
    return []
  }

  const isTabPermission = routeEntry.permissionId.startsWith('tab_')
  if (strictTab && isTabPermission) {
    return [routeEntry.permissionId]
  }

  return [routeEntry.permissionId, ...routeEntry.fallbackPermissionIds]
}
