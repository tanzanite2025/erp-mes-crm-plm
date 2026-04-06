export {
  MENU_PERMISSIONS,
  PERMISSION_VERSION,
  ROUTE_TO_MENU_MAPPING,
  exportPermissionCatalog,
  generatePermissionId,
  getMenuPermissionForPath,
  getRootPathForRoute,
  migratePermissions,
  normalizePermissionPath,
} from './permission-catalog'

export {
  clearRoutePermissionsCache,
  getPermissionsWithCache,
  type GeneratedRoutePermissions,
  RoutePermissionsGenerator,
  type RoutePermissionEntry,
} from './route-permissions-generator'

export {
  collectDefaultPermissions,
  DEFAULT_PERMISSIONS,
  validateDefaultPermissionsContract,
} from './default-permissions'

export {
  getDefaultPermissionChildrenMap,
  getDefaultPermissionOrderMap,
  getDefaultPermissionParentMap,
  getDefaultPermissions,
  getKnownDefaultPermissionIds,
} from './default-permission-queries'

export {
  ROUTE_DERIVED_MENU_PERMISSIONS,
  ROUTE_DERIVED_PERMISSIONS,
  ROUTE_PERMISSION_ENTRIES,
  ROUTE_PERMISSION_MAP,
} from './route-permission-registry'

export {
  findRoutePermissionEntry,
  matchesRoutePermissionPattern,
  resolveRoutePermissionIds,
} from './route-permission-queries'

export { generatePermissionMatrixUI, type PermissionMatrixUI } from './permission-matrix-generator'
