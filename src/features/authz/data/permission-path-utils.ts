export function normalizePermissionPath(path: string): string {
  const normalized = path.replace(/\/+/g, '/').replace(/\/$/, '')
  return normalized || '/'
}

export function resolveRootPathForRoute(path: string): string {
  const normalizedPath = normalizePermissionPath(path)
  const firstSegment = normalizedPath.split('/').filter(Boolean)[0]
  return firstSegment ? `/${firstSegment}` : '/dashboard'
}

export function buildPermissionId(type: 'page' | 'tab', path: string): string {
  const normalizedPath = normalizePermissionPath(path)

  if (type === 'page' && normalizedPath === '/') {
    return 'page_dashboard_home'
  }

  const normalized = normalizedPath
    .split('/')
    .filter(Boolean)
    .join('_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')

  return `${type}_${normalized || 'root'}`
}
