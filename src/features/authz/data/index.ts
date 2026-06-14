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
  getRouteDerivedMenuPermissions,
  getRouteDerivedPermissions,
  getRoutePermissionEntries,
  getRoutePermissionMap,
} from './route-permission-registry'

export {
  findRoutePermissionEntry,
  matchesRoutePermissionPattern,
  resolveRoutePermissionIds,
} from './route-permission-queries'

export {
  generatePermissionMatrixUI,
  type PermissionMatrixUI,
} from './permission-matrix-generator'
