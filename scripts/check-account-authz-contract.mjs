import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const sourceCache = new Map()
const userRoutesFile = 'server/routes/routes_users.go'

const routeContracts = [
  {
    file: userRoutesFile,
    signature: 'authorized.GET("/users",',
    permissions: [
      'TabPersonnelAccounts',
      'TabPersonnelRights',
      'PermissionUserView',
      'PermissionManage',
    ],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.GET("/users/options",',
    permissions: [
      'TabPersonnelAccounts',
      'TabPersonnelRights',
      'MenuSystem',
      'PermissionUserView',
      'PermissionManage',
    ],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.POST("/users/admin/verify",',
    permissions: ['PermissionManage'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.GET("/users/:id/access",',
    permissions: ['TabPersonnelRights', 'PermissionManage'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.GET("/users/:id/permissions",',
    permissions: ['TabPersonnelRights', 'PermissionManage'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.PUT("/users/:id/permissions",',
    permissions: ['PermissionManage'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.POST("/users/:id/bind-employee",',
    permissions: ['PermissionManage'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.POST("/users/:id/unbind-employee",',
    permissions: ['PermissionManage'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.POST("/users",',
    permissions: ['PermissionUserCreate'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.PATCH("/users/:id",',
    permissions: ['PermissionUserEdit'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.PUT("/users/:id",',
    permissions: ['PermissionUserEdit'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.DELETE("/users/:id",',
    permissions: ['PermissionUserDelete'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.POST("/users/bulk-delete",',
    permissions: ['PermissionUserDelete'],
  },
  {
    file: userRoutesFile,
    signature: 'authorized.POST("/users/sync",',
    permissions: ['PermissionManage'],
  },
  {
    file: 'server/routes/routes_authz.go',
    signature: 'permissionPresetGroup.GET("",',
    permissions: [
      'TabPersonnelAccounts',
      'TabPersonnelRights',
      'PermissionUserView',
      'PermissionManage',
    ],
  },
]

function readSource(relativePath) {
  if (!sourceCache.has(relativePath)) {
    sourceCache.set(
      relativePath,
      fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf8'),
    )
  }
  return sourceCache.get(relativePath)
}

function findUniqueLine(relativePath, signature) {
  const matches = readSource(relativePath)
    .split(/\r?\n/)
    .filter((line) => line.includes(signature))

  if (matches.length !== 1) {
    throw new Error(
      `[account-authz] Expected one route matching ${signature} in ${relativePath}, found ${matches.length}.`,
    )
  }
  return matches[0]
}

function extractPermissionSymbols(line) {
  const middlewareMatch = line.match(
    /middleware\.RequireAnyPermission\(([^)]*)\)/,
  )
  if (!middlewareMatch) {
    throw new Error(
      `[account-authz] Sensitive route is missing inline RequireAnyPermission: ${line.trim()}`,
    )
  }
  return Array.from(
    middlewareMatch[1].matchAll(/authz\.([A-Za-z0-9_]+)/g),
    (match) => match[1],
  ).sort()
}

function assertSamePermissions(contract, actual) {
  const expected = [...contract.permissions].sort()
  if (
    expected.length !== actual.length ||
    expected.some((permission, index) => permission !== actual[index])
  ) {
    throw new Error(
      `[account-authz] ${contract.signature} expected [${expected.join(', ')}], received [${actual.join(', ')}].`,
    )
  }
}

routeContracts.forEach((contract) => {
  const line = findUniqueLine(contract.file, contract.signature)
  assertSamePermissions(contract, extractPermissionSymbols(line))
})

const permissionPresetRouteSource = readSource('server/routes/routes_authz.go')
const permissionPresetManageLine = findUniqueLine(
  'server/routes/routes_authz.go',
  'permissionPresetManage := middleware.RequireAnyPermission(',
)
assertSamePermissions(
  {
    signature: 'permissionPresetManage',
    permissions: ['PermissionManage'],
  },
  extractPermissionSymbols(permissionPresetManageLine),
)

for (const signature of [
  'permissionPresetGroup.POST("", permissionPresetManage,',
  'permissionPresetGroup.DELETE("/:id", permissionPresetManage,',
]) {
  if (!permissionPresetRouteSource.includes(signature)) {
    throw new Error(
      `[account-authz] Sensitive permission preset route must use permissionPresetManage: ${signature}`,
    )
  }
}

const auditHandlerSource = readSource('server/handlers/audit_handlers.go')
for (const forbiddenContract of [
  /AuditModuleUser:\s*\{[^}]*authz\.MenuOrg/,
  /AuditModuleRole:\s*\{[^}]*authz\.MenuOrg/,
  /AuditModuleUserPermission:\s*\{[^}]*authz\.MenuOrg/,
]) {
  if (forbiddenContract.test(auditHandlerSource)) {
    throw new Error(
      '[account-authz] menu_org must not authorize account, role, or user-permission audit data.',
    )
  }
}

const userCreateHandlerSource = readSource(
  'server/handlers/user_create_handler.go',
)
const userUpdateHandlerSource = readSource(
  'server/handlers/user_update_handlers.go',
)
const bulkSyncServiceSource = readSource(
  'server/services/user_bulk_sync_service.go',
)

if (!userCreateHandlerSource.includes('verifyCurrentUserAdminChallenge')) {
  throw new Error(
    '[account-authz] Admin account creation must verify the challenge in the final create request.',
  )
}
if (
  (userUpdateHandlerSource.match(/verifyCurrentUserAdminChallenge/g) || [])
    .length < 2
) {
  throw new Error(
    '[account-authz] PATCH and PUT admin-role promotions must verify the challenge in the final request.',
  )
}
if (
  !bulkSyncServiceSource.includes('normalizeEmployeeBindingUpdate') ||
  !bulkSyncServiceSource.includes('writeUserAuditEntryWithContext')
) {
  throw new Error(
    '[account-authz] Bulk user sync must reuse employee-binding validation and write user audit entries.',
  )
}

console.log(
  `Account authorization contract verified: ${routeContracts.length + 2} routes`,
)
