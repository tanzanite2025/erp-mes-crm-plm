import type { Permission } from '@/features/authz/data/permission-schema'
import { findRoutePermissionEntry } from '@/features/authz/data/route-permission-queries'
import { getRoutePermissionEntries } from '@/features/authz/data/route-permission-registry'
import { buildPermissionTreeNodes } from '@/features/authz/utils/permission-tree-utils'

export type AiPermissionGroup = {
  id: string
  module: Permission
  permissions: Permission[]
  permissionIds: string[]
}

function isSelectableAiRoutePermissionId(permissionId: string) {
  const normalizedPermissionId = permissionId.trim().toLowerCase()
  return (
    normalizedPermissionId.startsWith('page_') ||
    normalizedPermissionId.startsWith('tab_')
  )
}

function permissionMatches(permission: Permission, query: string) {
  return [
    permission.id,
    permission.label,
    permission.desc,
    permission.path || '',
  ]
    .join(' ')
    .toLowerCase()
    .includes(query)
}

export function getAiRoutePermissionIds(): string[] {
  return Array.from(
    new Set(
      getRoutePermissionEntries()
        .map((routeEntry) => routeEntry.permissionId)
        .filter(isSelectableAiRoutePermissionId)
    )
  )
}

export function buildAiPermissionGroups(
  permissions: ReadonlyArray<Permission>,
  routePermissionIds: ReadonlyArray<string> = getAiRoutePermissionIds()
): AiPermissionGroup[] {
  const routePermissionIdSet = new Set(
    routePermissionIds.map((permissionId) => permissionId.toLowerCase())
  )

  return buildPermissionTreeNodes(permissions).flatMap((node) => {
    const groupPermissions = [
      ...node.pages.flatMap((pageNode) => [pageNode.page, ...pageNode.tabs]),
      ...node.directTabs,
    ].filter(
      (permission) =>
        isSelectableAiRoutePermissionId(permission.id) &&
        routePermissionIdSet.has(permission.id.toLowerCase())
    )

    if (groupPermissions.length === 0) {
      return []
    }

    return [
      {
        id: node.module.id,
        module: node.module,
        permissions: groupPermissions,
        permissionIds: groupPermissions.map((permission) => permission.id),
      },
    ]
  })
}

export function filterAiPermissionGroups(
  groups: ReadonlyArray<AiPermissionGroup>,
  query: string
): AiPermissionGroup[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return [...groups]
  }

  return groups.flatMap((group) => {
    if (permissionMatches(group.module, normalizedQuery)) {
      return [group]
    }

    const permissions = group.permissions.filter((permission) =>
      permissionMatches(permission, normalizedQuery)
    )

    return permissions.length > 0 ? [{ ...group, permissions }] : []
  })
}

export function isAiRoutePermissionAllowed(
  pathname: string,
  allowedPermissionIds: ReadonlyArray<string> | null | undefined
): boolean {
  const routePermissionId = findRoutePermissionEntry(pathname)?.permissionId
  if (
    !routePermissionId ||
    !isSelectableAiRoutePermissionId(routePermissionId)
  ) {
    return false
  }

  const safeAllowedPermissionIds = allowedPermissionIds ?? []
  const normalizedRoutePermissionId = routePermissionId.toLowerCase()
  return safeAllowedPermissionIds.some(
    (permissionId) =>
      permissionId.trim().toLowerCase() === normalizedRoutePermissionId
  )
}

export function togglePermissionSelection(
  currentIds: ReadonlyArray<string>,
  targetIds: ReadonlyArray<string>
): string[] {
  const normalizedTargets = new Map<string, string>()
  targetIds.forEach((permissionId) => {
    const normalizedId = permissionId.trim().toLowerCase()
    if (normalizedId && !normalizedTargets.has(normalizedId)) {
      normalizedTargets.set(normalizedId, permissionId)
    }
  })

  if (normalizedTargets.size === 0) {
    return [...currentIds]
  }

  const currentIdSet = new Set(
    currentIds.map((permissionId) => permissionId.trim().toLowerCase())
  )
  const shouldSelect = Array.from(normalizedTargets.keys()).some(
    (permissionId) => !currentIdSet.has(permissionId)
  )

  if (!shouldSelect) {
    return currentIds.filter(
      (permissionId) =>
        !normalizedTargets.has(permissionId.trim().toLowerCase())
    )
  }

  return [
    ...currentIds,
    ...Array.from(normalizedTargets.entries()).flatMap(
      ([normalizedId, permissionId]) =>
        currentIdSet.has(normalizedId) ? [] : [permissionId]
    ),
  ]
}
