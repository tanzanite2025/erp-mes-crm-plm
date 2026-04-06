import { AUTHENTICATED_ROUTE_PATHS } from './authenticated-route-catalog'
import { PERMISSION_VERSION } from './permission-catalog'
import {
  clearRoutePermissionsCache,
  getPermissionsWithCache,
} from './route-permissions-generator'

const generatedRoutePermissions = getPermissionsWithCache(
  PERMISSION_VERSION,
  AUTHENTICATED_ROUTE_PATHS,
)

export { clearRoutePermissionsCache, getPermissionsWithCache }

export const ROUTE_DERIVED_PERMISSIONS = generatedRoutePermissions.permissions
export const ROUTE_PERMISSION_ENTRIES = generatedRoutePermissions.routePermissionEntries
export const ROUTE_PERMISSION_MAP = generatedRoutePermissions.routePermissionMap
export const ROUTE_DERIVED_MENU_PERMISSIONS = ROUTE_DERIVED_PERMISSIONS.filter(
  (permission) => permission.category === 'menu',
)
