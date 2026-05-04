import { AUTHENTICATED_ROUTE_PATHS as AUTHENTICATED_ROUTE_CATALOG } from './authenticated-route-catalog'

const EXCLUDED_ROOT_SEGMENTS = new Set(['errors', 'experimental'])

function normalizePath(path: string): string {
  const normalized = path
    .replace(/\\/g, '/')
    .replace(/\/+$/g, '')
    .replace(/\/+/g, '/')
  return normalized || '/'
}

function comparePathsBySpecificity(a: string, b: string): number {
  const aSegments = normalizePath(a).split('/').filter(Boolean)
  const bSegments = normalizePath(b).split('/').filter(Boolean)

  if (aSegments.length !== bSegments.length) {
    return bSegments.length - aSegments.length
  }

  const aStaticCount = aSegments.filter(
    (segment) => !segment.startsWith(':')
  ).length
  const bStaticCount = bSegments.filter(
    (segment) => !segment.startsWith(':')
  ).length

  if (aStaticCount !== bStaticCount) {
    return bStaticCount - aStaticCount
  }

  return b.length - a.length
}

function isIncludedAuthenticatedRoutePath(routePath: string): boolean {
  const segments = normalizePath(routePath).split('/').filter(Boolean)
  if (segments.length === 0) {
    return true
  }

  return !EXCLUDED_ROOT_SEGMENTS.has(segments[0])
}

const AUTHENTICATED_ROUTE_PATHS = Array.from(
  new Set([
    '/',
    ...AUTHENTICATED_ROUTE_CATALOG
      .map((routePath) => normalizePath(routePath))
      .filter((routePath) => isIncludedAuthenticatedRoutePath(routePath)),
  ])
).sort(comparePathsBySpecificity)

export function getAuthenticatedRoutePaths(): readonly string[] {
  return [...AUTHENTICATED_ROUTE_PATHS]
}
