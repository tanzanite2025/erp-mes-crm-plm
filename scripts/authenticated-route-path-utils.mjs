import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const EXCLUDED_ROOT_SEGMENTS = new Set(['errors', 'experimental'])

export function normalizePath(path) {
  const normalized = path.replace(/\\/g, '/').replace(/\/+$/g, '').replace(/\/+/g, '/')
  return normalized || '/'
}

function sanitizeToken(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function comparePathsBySpecificity(a, b) {
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

export function routeFilePathToRoutePath(authenticatedRoutesDir, filePath) {
  const relativeWithoutExt = relative(authenticatedRoutesDir, filePath).replace(/\\/g, '/').replace(/\.tsx$/, '')
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

  const routeTokens = []

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

export function walkTsxFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      return walkTsxFiles(entryPath)
    }
    if (entry.isFile() && entry.name.endsWith('.tsx')) {
      return [entryPath]
    }
    return []
  })
}

export function collectAuthenticatedRoutePaths(authenticatedRoutesDir) {
  const routePaths = new Set(['/'])

  walkTsxFiles(authenticatedRoutesDir).forEach((filePath) => {
    const routePath = routeFilePathToRoutePath(authenticatedRoutesDir, filePath)
    if (routePath) {
      routePaths.add(routePath)
    }
  })

  return Array.from(routePaths).sort(comparePathsBySpecificity)
}
