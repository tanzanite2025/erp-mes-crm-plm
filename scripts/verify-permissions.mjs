import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import ts from 'typescript'
import { collectAuthenticatedRoutePaths } from './authenticated-route-path-utils.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const nodeRequire = createRequire(import.meta.url)

const moduleCache = new Map()

function resolveTsModulePath(fromFile, specifier) {
  const basePath = path.isAbsolute(specifier)
    ? specifier
    : specifier.startsWith('/')
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
    throw new Error(`[verify-permissions] Cannot resolve TS module: ${specifier} from ${fromFile}`)
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
    if (specifier.startsWith('@/')) {
      const resolved = resolveTsModulePath(
        projectRoot,
        path.resolve(projectRoot, 'src', specifier.slice(2)),
      )
      return loadTsModule(resolved)
    }
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      const resolved = resolveTsModulePath(normalizedPath, specifier)
      return loadTsModule(resolved)
    }
    return nodeRequire(specifier)
  }

  const script = new vm.Script(transpiled, {
    filename: normalizedPath,
  })

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

const permissionCatalogModulePath = path.resolve(
  projectRoot,
  'src/features/authz/data/permission-catalog.ts',
)
const routePermissionsGeneratorModulePath = path.resolve(
  projectRoot,
  'src/features/authz/data/route-permissions-generator.ts',
)
const authenticatedRoutesDir = path.resolve(projectRoot, 'src/routes/_authenticated')

const { PERMISSION_VERSION, exportPermissionCatalog, migratePermissions } = loadTsModule(
  permissionCatalogModulePath,
)
const {
  clearRoutePermissionsCache,
  getPermissionsWithCache,
} = loadTsModule(routePermissionsGeneratorModulePath)

const catalog = exportPermissionCatalog()
const routePaths = collectAuthenticatedRoutePaths(authenticatedRoutesDir)
const generatedRoutePermissions = getPermissionsWithCache(PERMISSION_VERSION, routePaths)
const entries = generatedRoutePermissions.routePermissionEntries

if (!Array.isArray(entries)) {
  throw new Error(
    '[verify-permissions] routePermissionEntries is unavailable or malformed. Check route-permissions generation.',
  )
}

console.log('=== Permission Catalog Check ===')
console.log(`Permission version: ${PERMISSION_VERSION}`)
console.log(`Menu permissions: ${catalog.menus.length}`)
console.log(`Route mappings: ${Object.keys(catalog.routeMapping).length}`)
console.log(`Route permission entries: ${entries.length}`)

const allPermissionIds = new Set()
entries.forEach((entry) => {
  allPermissionIds.add(entry.permissionId)
  entry.fallbackPermissionIds.forEach((id) => allPermissionIds.add(id))
})

console.log(`Total unique permission ids: ${allPermissionIds.size}`)

const duplicatePaths = entries
  .map((entry) => entry.path)
  .filter((pathValue, index, list) => list.indexOf(pathValue) !== index)

if (duplicatePaths.length > 0) {
  console.warn(`Duplicate route permission entries detected: ${duplicatePaths.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('No duplicate route permission entries')
}

const unmappedRootPaths = Array.from(
  new Set(
    entries
      .map((entry) => `/${entry.path.split('/').filter(Boolean)[0] || 'dashboard'}`)
      .filter((rootPath) => !catalog.routeMapping[rootPath]),
  ),
)

if (unmappedRootPaths.length > 0) {
  console.warn(`Unmapped top-level paths (falling back to menu_system): ${unmappedRootPaths.join(', ')}`)
}

const migrationProbeSource = ['menu_dashboard', 'tab_dashboard_overview']
const migrationProbeResult = migratePermissions(
  PERMISSION_VERSION,
  PERMISSION_VERSION,
  migrationProbeSource,
)
if (
  migrationProbeResult.length !== migrationProbeSource.length ||
  migrationProbeResult.some((permissionId, index) => permissionId !== migrationProbeSource[index])
) {
  throw new Error('[verify-permissions] migratePermissions passthrough contract violated')
}

clearRoutePermissionsCache()
const cacheProbePaths = entries.map((entry) => entry.path)
const cacheProbeFirst = getPermissionsWithCache(PERMISSION_VERSION, cacheProbePaths)
const cacheProbeSecond = getPermissionsWithCache(PERMISSION_VERSION, cacheProbePaths)
if (cacheProbeFirst !== cacheProbeSecond) {
  throw new Error('[verify-permissions] route permissions cache was not hit for identical input')
}

console.log('Migration hook check: passed')
console.log('Route permission cache check: passed')

console.log('Permission verification completed')
