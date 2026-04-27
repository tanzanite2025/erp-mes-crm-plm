import type { Permission } from '@/features/authz/data/permission-schema'
import { getAuthenticatedRoutePaths } from './authenticated-route-paths'
import { PERMISSION_VERSION } from './permission-catalog'
import {
  clearRoutePermissionsCache,
  getPermissionsWithCache,
  type RoutePermissionEntry,
} from './route-permissions-generator'

function getGeneratedRoutePermissions() {
  return getPermissionsWithCache(PERMISSION_VERSION, getAuthenticatedRoutePaths())
}

export { clearRoutePermissionsCache, getPermissionsWithCache }

export function getRouteDerivedPermissions(): Permission[] {
  return [...getGeneratedRoutePermissions().permissions]
}

export function getRoutePermissionEntries(): RoutePermissionEntry[] {
  return [...getGeneratedRoutePermissions().routePermissionEntries]
}

export function getRoutePermissionMap(): Record<string, string> {
  return { ...getGeneratedRoutePermissions().routePermissionMap }
}

export function getRouteDerivedMenuPermissions(): Permission[] {
  return getRouteDerivedPermissions().filter((permission) => permission.category === 'menu')
}
