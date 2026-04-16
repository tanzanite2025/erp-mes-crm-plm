const AUTHENTICATED_ROUTE_MODULES = import.meta.glob('/src/routes/_authenticated/**/*.tsx')

const EXCLUDED_ROOT_SEGMENTS = new Set(['errors', 'experimental', 'labs'])

function normalizePath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/g, '').replace(/\/+/g, '/')
  return normalized || '/'
}

function sanitizeToken(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function comparePathsBySpecificity(a: string, b: string): number {
  const aSegments = normalizePath(a).split('/').filter(Boolean)
  const bSegments = normalizePath(b).split('/').filter(Boolean)

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

function routeModulePathToRoutePath(modulePath: string): string | null {
  const relativeWithoutExt = modulePath
    .replace(/\\/g, '/')
    .replace(/^\/src\/routes\/_authenticated\//, '')
    .replace(/\.tsx$/, '')

  if (!relativeWithoutExt) {
    return null
  }

  if (relativeWithoutExt === 'system-management/logistics-api') {
    return null
  }

  const fileParts = relativeWithoutExt.split('/').filter(Boolean)
  const basename = fileParts[fileParts.length - 1]
  if (basename === 'route') {
    return null
  }

  const routeTokens: string[] = []

  fileParts.forEach((part, index) => {
    const isLast = index === fileParts.length - 1
    const tokens = part.split('.').filter(Boolean)

    if (isLast && tokens.length === 1 && tokens[0] === 'index') {
      return
    }

    tokens.forEach((token) => {
      if (token === 'index' || token === 'route' || token === 'lazy') {
        return
      }
      if (token.startsWith('_') || token.startsWith('(')) {
        return
      }
      if (token.startsWith('$')) {
        const dynamicName = sanitizeToken(token.slice(1))
        routeTokens.push(`:${dynamicName || 'param'}`)
        return
      }
      routeTokens.push(token)
    })
  })

  if (routeTokens.length === 0) {
    return '/'
  }

  if (EXCLUDED_ROOT_SEGMENTS.has(routeTokens[0])) {
    return null
  }

  return normalizePath(`/${routeTokens.join('/')}`)
}

const AUTHENTICATED_ROUTE_PATHS = Array.from(
  new Set([
    '/',
    ...Object.keys(AUTHENTICATED_ROUTE_MODULES)
      .map((modulePath) => routeModulePathToRoutePath(modulePath))
      .filter((routePath): routePath is string => Boolean(routePath)),
  ]),
).sort(comparePathsBySpecificity)

export function getAuthenticatedRoutePaths(): readonly string[] {
  return [...AUTHENTICATED_ROUTE_PATHS]
}
