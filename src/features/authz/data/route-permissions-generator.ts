import type { Permission } from '@/features/authz/data/permission-schema'
import {
  MENU_PERMISSIONS,
  generatePermissionId,
  getMenuPermissionForPath,
} from './permission-catalog'
import { resolveRoutePermissionLabel } from './route-permission-labels'

export type RoutePermissionEntry = {
  path: string
  permissionId: string
  fallbackPermissionIds: string[]
}

export type GeneratedRoutePermissions = {
  permissions: Permission[]
  routePermissionEntries: RoutePermissionEntry[]
  routePermissionMap: Record<string, string>
}

const HIDDEN_PAGE_PATHS = new Set(['/', '/dashboard'])

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '')
  return normalized || '/'
}

function splitPath(path: string): string[] {
  return normalizePath(path).split('/').filter(Boolean)
}

function isLazyPath(path: string): boolean {
  return splitPath(path).includes('lazy')
}

function comparePathsBySpecificity(a: string, b: string): number {
  const aSegments = splitPath(a)
  const bSegments = splitPath(b)

  if (aSegments.length !== bSegments.length) {
    return bSegments.length - aSegments.length
  }

  const aStaticCount = aSegments.filter((segment) => !segment.startsWith(':')).length
  const bStaticCount = bSegments.filter((segment) => !segment.startsWith(':')).length
  if (aStaticCount !== bStaticCount) {
    return bStaticCount - aStaticCount
  }

  return b.length - a.length
}

function formatPathLabel(path: string): string {
  const configuredLabel = resolveRoutePermissionLabel(path)
  if (configuredLabel) return configuredLabel

  const segments = splitPath(path)
  if (segments.length === 0) return '仪表盘首页'

  return segments
    .map((segment) => segment.replace(/^:/, '参数 ').replace(/-/g, ' '))
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' > ')
}

function toUniqueIds(ids: Array<string | undefined>): string[] {
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))))
}

function buildRoutePathsSignature(routePaths: readonly string[]): string {
  return [...routePaths].map((path) => normalizePath(path)).sort().join('|')
}

const routePermissionsCache = new Map<string, GeneratedRoutePermissions>()

/**
 * Clear route permission cache.
 */
export function clearRoutePermissionsCache(): void {
  routePermissionsCache.clear()
}

/**
 * Get route permissions with versioned cache.
 */
export function getPermissionsWithCache(
  version: string,
  routePaths: readonly string[],
): GeneratedRoutePermissions {
  const cacheKey = `${version}::${buildRoutePathsSignature(routePaths)}`
  const cached = routePermissionsCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const generator = new RoutePermissionsGenerator(routePaths)
  const generated = generator.generatePermissions()
  routePermissionsCache.set(cacheKey, generated)
  return generated
}

/**
 * Generate route-derived permission structures from authenticated routes.
 */
export class RoutePermissionsGenerator {
  private readonly routePaths: string[]

  /**
   * Create a route permissions generator instance.
   */
  constructor(routePaths: readonly string[]) {
    const normalized = routePaths
      .map((path) => normalizePath(path))
      .filter((path) => !isLazyPath(path))
    this.routePaths = Array.from(new Set(normalized)).sort(comparePathsBySpecificity)
  }

  /**
   * Generate menu/page/tab permissions and route permission entries.
   */
  generatePermissions(): GeneratedRoutePermissions {
    const permissionById = new Map<string, Permission>()
    const pagePermissionByPath = new Map<string, Permission>()
    const tabPermissionByPath = new Map<string, Permission>()

    Object.values(MENU_PERMISSIONS).forEach((menuPermission) => {
      permissionById.set(menuPermission.id, {
        id: menuPermission.id,
        label: menuPermission.label,
        desc: menuPermission.desc,
        category: 'menu',
        path: menuPermission.rootPath,
      })
    })

    this.routePaths.forEach((path) => {
      const segments = splitPath(path)
      if (segments.length > 1 || HIDDEN_PAGE_PATHS.has(path)) {
        return
      }

      const menuId = getMenuPermissionForPath(path)
      const permissionId = generatePermissionId('page', path)
      const pagePermission: Permission = {
        id: permissionId,
        label: `页面：${formatPathLabel(path)}`,
        desc: `允许访问页面 ${path}`,
        category: 'page',
        parentId: menuId,
        path,
      }

      pagePermissionByPath.set(path, pagePermission)
      permissionById.set(permissionId, pagePermission)
    })

    this.routePaths.forEach((path) => {
      const segments = splitPath(path)
      if (segments.length <= 1) {
        return
      }

      const menuId = getMenuPermissionForPath(path)
      const parentPath = `/${segments[0]}`
      const parentPageId = pagePermissionByPath.get(parentPath)?.id

      const tabPermission: Permission = {
        id: generatePermissionId('tab', path),
        label: `TAB：${formatPathLabel(path)}`,
        desc: `允许访问 TAB 页面 ${path}`,
        category: 'tab',
        parentId: parentPageId || menuId,
        path,
      }

      tabPermissionByPath.set(path, tabPermission)
      permissionById.set(tabPermission.id, tabPermission)
    })

    const routePermissionEntries: RoutePermissionEntry[] = this.routePaths.map((path) => {
      const segments = splitPath(path)
      const menuId = getMenuPermissionForPath(path)

      if (segments.length <= 1) {
        const pagePermissionId = pagePermissionByPath.get(path)?.id
        const permissionId = pagePermissionId || menuId

        return {
          path,
          permissionId,
          fallbackPermissionIds: toUniqueIds([menuId]).filter((id) => id !== permissionId),
        }
      }

      const tabPermissionId = tabPermissionByPath.get(path)?.id
      const permissionId = tabPermissionId || menuId

      return {
        path,
        permissionId,
        fallbackPermissionIds: [],
      }
    })

    routePermissionEntries.sort((a, b) => comparePathsBySpecificity(a.path, b.path))

    const routePermissionMap = routePermissionEntries.reduce(
      (acc, entry) => {
        acc[entry.path] = entry.permissionId
        return acc
      },
      {} as Record<string, string>,
    )

    return {
      permissions: Array.from(permissionById.values()),
      routePermissionEntries,
      routePermissionMap,
    }
  }
}
