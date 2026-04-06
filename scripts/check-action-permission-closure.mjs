import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const nodeRequire = createRequire(import.meta.url)

const moduleCache = new Map()
const ACTION_ID_PATTERN = /\b(?:action_[a-z0-9_]+|user_[a-z0-9_]+|perm_[a-z0-9_]+)\b/g
const GROUP_DECLARATION_PATTERN = /(\w+)\s*:=\s*(\w+)\.Group\("([^"]*)"\)/g
const ROUTE_DECLARATION_PATTERN = /(\w+)\.(GET|POST|PUT|PATCH|DELETE)\("([^"]*)"/g
const MIDDLEWARE_ASSIGNMENT_PATTERN = /(\w+)\s*:=\s*middleware\.RequirePermissions\(([^\)]*)\)/g
const REQUIRE_PERMISSIONS_PATTERN = /RequirePermissions\(([^\)]*)\)/g
const AUTHZ_SYMBOL_PATTERN = /authz\.([A-Za-z0-9_]+)/g
const GO_CONST_ENTRY_PATTERN = /^\s*([A-Za-z0-9_]+)\s*=\s*"([^"]+)"/gm
const UNBOUND_ROUTE_EXCLUSION_KEYS = new Set([
  'POST /materials',
  'DELETE /materials/:id',
  'POST /materials/sync',
  'POST /engineering/products',
  'POST /engineering/products/sync',
  'POST /engineering/bom',
  'DELETE /engineering/bom/:id',
  'POST /engineering/change-orders',
  'DELETE /engineering/change-orders/:id',
  'POST /engineering/templates',
  'POST /engineering/templates/sync',
  'POST /engineering/product-types',
  'POST /engineering/product-types/sync',
  'POST /engineering/specs',
  'POST /engineering/specs/sync',
  'DELETE /engineering/specs/:id',
  'POST /dictionary/groups',
  'POST /dictionary/entries',
  'POST /dictionary/sync',
  'POST /dictionary/bulk-sync',
  'POST /packaging',
  'DELETE /packaging/:id',
  'POST /basic/units',
  'POST /basic/units/sync',
  'DELETE /basic/units/:id',
  'POST /system/routing/commands',
  'PUT /system/routing/commands/:id',
  'DELETE /system/routing/commands/:id',
  'POST /system/routing/rules',
  'PUT /system/routing/rules/:id',
  'DELETE /system/routing/rules/:id',
  'POST /numbering/rules',
  'POST /protocols/linear-barcode',
  'POST /finance/currencies',
  'POST /finance/currencies/:id/set-base',
  'POST /finance/currencies/sync',
  'POST /finance/payment-terms',
  'POST /finance/tax-rates',
  'POST /finance/seed',
  'POST /production/lines',
  'DELETE /production/lines/:id',
  'POST /production/processes',
  'DELETE /production/processes/:id',
  'POST /production/mappings/assign',
  'POST /production/mappings/remove',
  'POST /quality/standards',
  'POST /piecework/teams',
  'DELETE /piecework/teams/:id',
  'POST /piecework/rates',
  'POST /experimental/categories',
  'DELETE /experimental/categories/:id',
])

function resolveTsModulePath(fromFile, specifier) {
  const basePath = specifier.startsWith('/')
    ? path.resolve(projectRoot, '.' + specifier)
    : path.resolve(path.dirname(fromFile), specifier)

  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
  ]

  const resolved = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile())
  if (!resolved) {
    throw new Error(`[action-closure] Cannot resolve TS module: ${specifier} from ${fromFile}`)
  }

  return resolved
}

function loadTsModule(modulePath) {
  const normalizedPath = path.resolve(modulePath)
  if (moduleCache.has(normalizedPath)) {
    return moduleCache.get(normalizedPath)
  }

  const source = fs.readFileSync(normalizedPath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
    },
    fileName: normalizedPath,
  }).outputText

  const module = { exports: {} }
  moduleCache.set(normalizedPath, module.exports)

  const localRequire = (specifier) => {
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const resolved = resolveTsModulePath(normalizedPath, specifier)
      return loadTsModule(resolved)
    }
    return nodeRequire(specifier)
  }

  const script = new vm.Script(transpiled, { filename: normalizedPath })
  const context = vm.createContext({
    module,
    exports: module.exports,
    require: localRequire,
    __dirname: path.dirname(normalizedPath),
    __filename: normalizedPath,
    process,
    console,
    Buffer,
    setTimeout,
    clearTimeout,
  })

  script.runInContext(context)
  moduleCache.set(normalizedPath, module.exports)
  return module.exports
}

function walkFiles(dir, predicate, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  entries.forEach((entry) => {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') return
      walkFiles(entryPath, predicate, list)
      return
    }
    if (predicate(entryPath)) {
      list.push(entryPath)
    }
  })
  return list
}

function toPosixPath(filePath) {
  return filePath.replace(/\\/g, '/')
}

function normalizeApiPath(pathValue) {
  const normalized = pathValue.replace(/:([A-Za-z0-9_]+)/g, ':$1').replace(/\/+/g, '/').replace(/\/$/, '')
  return normalized || '/'
}

function joinApiPaths(basePath, childPath) {
  if (!childPath || childPath === '') {
    return normalizeApiPath(basePath)
  }

  if (childPath === '/') {
    return normalizeApiPath(basePath)
  }

  if (childPath.startsWith('/')) {
    return normalizeApiPath(`${basePath}${childPath}`)
  }

  return normalizeApiPath(`${basePath}/${childPath}`)
}

function parseActionCatalog() {
  const catalogModulePath = path.resolve(projectRoot, 'src/features/authz/data/action-permission-catalog.ts')
  const { ACTION_PERMISSION_CATALOG } = loadTsModule(catalogModulePath)
  const entries = Object.values(ACTION_PERMISSION_CATALOG).flat()

  const byId = new Map()
  const routeBindingIndex = new Map()
  const invalidRouteBindings = []

  entries.forEach((entry) => {
    byId.set(entry.id, entry)

    entry.routeBindings.forEach((binding) => {
      let method
      let routePath

      if (typeof binding === 'string') {
        const match = binding.match(/^\s*(GET|POST|PUT|PATCH|DELETE)\s+([^\s(]+)\s*(?:\(.*\))?$/)
        if (!match) {
          invalidRouteBindings.push({ actionId: entry.id, binding, reason: 'unparseable_binding' })
          return
        }

        ;[, method, routePath] = match
      } else if (binding && typeof binding === 'object') {
        method = String(binding.method || '').trim().toUpperCase()
        routePath = String(binding.path || '').trim()
        if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(method) || !routePath) {
          invalidRouteBindings.push({ actionId: entry.id, binding, reason: 'invalid_structured_binding' })
          return
        }
      } else {
        invalidRouteBindings.push({ actionId: entry.id, binding, reason: 'unsupported_binding_type' })
        return
      }

      const key = `${method} ${normalizeApiPath(routePath)}`
      const existing = routeBindingIndex.get(key) || []
      existing.push(entry.id)
      routeBindingIndex.set(key, existing)
    })
  })

  return { entries, byId, routeBindingIndex, invalidRouteBindings }
}

function scanFrontendActionUsage() {
  const srcRoot = path.resolve(projectRoot, 'src')
  const files = walkFiles(srcRoot, (filePath) => /\.(ts|tsx)$/.test(filePath))
  const usageMap = new Map()

  files.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8')
    const matches = source.matchAll(ACTION_ID_PATTERN)
    for (const match of matches) {
      const actionId = match[0]
      const existing = usageMap.get(actionId) || []
      existing.push(path.relative(projectRoot, filePath))
      usageMap.set(actionId, existing)
    }
  })

  return new Map(
    Array.from(usageMap.entries()).map(([actionId, filePaths]) => [
      actionId,
      Array.from(new Set(filePaths.map((value) => toPosixPath(value)))).sort(),
    ]),
  )
}

function parseGoPermissionConstants() {
  const permissionsGoPath = path.resolve(projectRoot, 'server/authz/permissions.go')
  const source = fs.readFileSync(permissionsGoPath, 'utf8')
  return new Map(Array.from(source.matchAll(GO_CONST_ENTRY_PATTERN)).map((match) => [match[1], match[2]]))
}

function resolvePermissionIdsFromArgs(args, authzConstMap) {
  const symbolMatches = Array.from(args.matchAll(AUTHZ_SYMBOL_PATTERN))
  return Array.from(
    new Set(
      symbolMatches
        .map((symbolMatch) => authzConstMap.get(symbolMatch[1]))
        .filter(Boolean),
    ),
  ).sort()
}

function scanBackendRoutes(authzConstMap) {
  const routesRoot = path.resolve(projectRoot, 'server/routes')
  const routeFiles = walkFiles(routesRoot, (filePath) => filePath.endsWith('.go') && !filePath.endsWith('_test.go'))
  const protectedRoutes = []

  routeFiles.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8')
    const groupPrefixes = new Map([
      ['api', ''],
      ['authorized', ''],
      ['r', ''],
    ])
    const middlewareVariables = new Map()

    Array.from(source.matchAll(MIDDLEWARE_ASSIGNMENT_PATTERN)).forEach((assignmentMatch) => {
      const [, variableName, args] = assignmentMatch
      middlewareVariables.set(variableName, resolvePermissionIdsFromArgs(args, authzConstMap))
    })

    let resolvedNewGroup = true
    while (resolvedNewGroup) {
      resolvedNewGroup = false
      const groupMatches = Array.from(source.matchAll(GROUP_DECLARATION_PATTERN))
      groupMatches.forEach((groupMatch) => {
        const [, groupVar, parentVar, rawPrefix] = groupMatch
        if (groupPrefixes.has(groupVar)) {
          return
        }

        if (!groupPrefixes.has(parentVar)) {
          return
        }

        const parentPrefix = groupPrefixes.get(parentVar) || ''
        groupPrefixes.set(groupVar, joinApiPaths(parentPrefix, rawPrefix))
        resolvedNewGroup = true
      })
    }

    const methodMatches = Array.from(source.matchAll(ROUTE_DECLARATION_PATTERN))

    methodMatches.forEach((routeMatch) => {
      const groupVar = routeMatch[1]
      const method = routeMatch[2].toUpperCase()
      const routePath = routeMatch[3]
      const basePath = groupPrefixes.get(groupVar) || ''
      const lineStart = source.lastIndexOf('\n', routeMatch.index ?? 0) + 1
      const lineEndIndex = source.indexOf('\n', routeMatch.index ?? 0)
      const lineEnd = lineEndIndex === -1 ? source.length : lineEndIndex
      const lineText = source.slice(lineStart, lineEnd)

      const requireMatches = Array.from(lineText.matchAll(REQUIRE_PERMISSIONS_PATTERN))
      const resolvedPermissionIds = []
      requireMatches.forEach((requireMatch) => {
        resolvePermissionIdsFromArgs(requireMatch[1], authzConstMap).forEach((permissionId) => {
          resolvedPermissionIds.push(permissionId)
        })
      })

      const routeArguments = lineText
        .slice(lineText.indexOf('(') + 1, lineText.lastIndexOf(')'))
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)

      routeArguments.forEach((argument) => {
        if (!middlewareVariables.has(argument)) {
          return
        }

        middlewareVariables.get(argument).forEach((permissionId) => {
          resolvedPermissionIds.push(permissionId)
        })
      })

      protectedRoutes.push({
        filePath: toPosixPath(path.relative(projectRoot, filePath)),
        method,
        routePath: joinApiPaths(basePath, routePath),
        permissionIds: Array.from(new Set(resolvedPermissionIds)).sort(),
      })
    })
  })

  return protectedRoutes
}

function sortStrings(values) {
  return [...values].sort((a, b) => a.localeCompare(b))
}

function shouldExcludeUnboundRoute(routeKey, protectedActionIds) {
  if (!UNBOUND_ROUTE_EXCLUSION_KEYS.has(routeKey)) {
    return false
  }

  return protectedActionIds.every((permissionId) => permissionId === 'perm_manage')
}

function main() {
  const actionCatalog = parseActionCatalog()
  const frontendUsageMap = scanFrontendActionUsage()
  const authzConstMap = parseGoPermissionConstants()
  const backendRoutes = scanBackendRoutes(authzConstMap)

  const catalogActionIds = new Set(actionCatalog.entries.map((entry) => entry.id))
  const frontendActionIds = new Set(frontendUsageMap.keys())
  const backendProtectedRoutes = backendRoutes.filter((route) => route.permissionIds.some((id) => catalogActionIds.has(id)))
  const backendBoundActionIds = new Set(
    backendProtectedRoutes.flatMap((route) => route.permissionIds.filter((id) => catalogActionIds.has(id))),
  )

  const frontendOnlyActions = sortStrings(
    Array.from(frontendActionIds).filter((actionId) => !catalogActionIds.has(actionId)),
  )
  const catalogOnlyActions = sortStrings(
    Array.from(catalogActionIds).filter((actionId) => !frontendActionIds.has(actionId)),
  )

  const invalidRouteBindings = [...actionCatalog.invalidRouteBindings]
  const unboundBackendRoutes = []

  backendProtectedRoutes.forEach((route) => {
    const routeKey = `${route.method} ${route.routePath}`
    const boundActionIds = actionCatalog.routeBindingIndex.get(routeKey) || []
    const protectedActionIds = route.permissionIds.filter((id) => catalogActionIds.has(id))
    if (protectedActionIds.length === 0) return
    if (shouldExcludeUnboundRoute(routeKey, protectedActionIds)) return

    const hasAnyBinding = protectedActionIds.some((actionId) => boundActionIds.includes(actionId))
    if (!hasAnyBinding) {
      unboundBackendRoutes.push({
        route: routeKey,
        filePath: route.filePath,
        protectedActionIds,
      })
    }
  })

  actionCatalog.routeBindingIndex.forEach((actionIds, routeKey) => {
    const hasBackendRoute = backendRoutes.some((route) => `${route.method} ${route.routePath}` === routeKey)
    if (!hasBackendRoute) {
      actionIds.forEach((actionId) => {
        invalidRouteBindings.push({ actionId, binding: routeKey, reason: 'route_not_found' })
      })
    }
  })

  const report = {
    summary: {
      catalogActionCount: actionCatalog.entries.length,
      frontendActionCount: frontendActionIds.size,
      backendProtectedActionRouteCount: backendProtectedRoutes.length,
      backendBoundActionCount: backendBoundActionIds.size,
      frontendOnlyActionCount: frontendOnlyActions.length,
      catalogOnlyActionCount: catalogOnlyActions.length,
      unboundBackendRouteCount: unboundBackendRoutes.length,
      invalidRouteBindingCount: invalidRouteBindings.length,
    },
    frontend_only_actions: frontendOnlyActions.map((actionId) => ({
      actionId,
      files: frontendUsageMap.get(actionId) || [],
    })),
    catalog_only_actions: catalogOnlyActions.map((actionId) => ({
      actionId,
      routeBindings: actionCatalog.byId.get(actionId)?.routeBindings || [],
    })),
    unbound_backend_routes: unboundBackendRoutes,
    invalid_route_bindings: invalidRouteBindings,
  }

  console.log('=== ACTION Permission Closure Check ===')
  console.log(JSON.stringify(report, null, 2))

  if (
    report.frontend_only_actions.length > 0 ||
    report.unbound_backend_routes.length > 0 ||
    report.invalid_route_bindings.length > 0
  ) {
    process.exitCode = 1
  }
}

main()
