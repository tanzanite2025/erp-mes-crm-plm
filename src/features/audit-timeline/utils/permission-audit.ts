import type { AuditLog } from '../types'

type PermissionLabelSource = {
  id: string
  label: string
  category?: string
  parentId?: string
}

export type PermissionAuditTarget = {
  id: string
  username: string
  status: string
  employeeId: string
}

export type PermissionAuditBadgeItem = {
  key: string
  permissionId: string
  label: string
}

export type UserPermissionAuditSummary = {
  beforePermissionIds: string[]
  afterPermissionIds: string[]
  beforePermissionItems: PermissionAuditBadgeItem[]
  afterPermissionItems: PermissionAuditBadgeItem[]
  addedPermissionItems: PermissionAuditBadgeItem[]
  removedPermissionItems: PermissionAuditBadgeItem[]
  source: string
  reason: string
  grantedBy: string
  target: PermissionAuditTarget | null
}

function normalizeAuditString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePermissionId(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePermissionIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const result: string[] = []

  value.forEach((item) => {
    const normalized = normalizePermissionId(String(item ?? ''))
    if (!normalized || seen.has(normalized)) {
      return
    }
    seen.add(normalized)
    result.push(normalized)
  })

  return result
}

function mapPermissionBadgeItems(
  permissionIds: string[],
  permissionLabelMap: ReadonlyMap<string, string>
): PermissionAuditBadgeItem[] {
  return permissionIds.map((permissionId) => ({
    key: permissionId,
    permissionId,
    label: permissionLabelMap.get(permissionId) ?? permissionId,
  }))
}

function readDiffValue(log: AuditLog, field: string): unknown {
  return log.diff.find((item) => item.f === field)?.n
}

function parseTarget(value: unknown): PermissionAuditTarget | null {
  if (!isRecord(value)) {
    return null
  }

  return {
    id: normalizeAuditString(value.id),
    username: normalizeAuditString(value.username),
    status: normalizeAuditString(value.status),
    employeeId: normalizeAuditString(value.employeeId),
  }
}

export function buildPermissionLabelMap(
  permissions: ReadonlyArray<PermissionLabelSource>,
  normalizeLabel: (label: string) => string
): ReadonlyMap<string, string> {
  return new Map(
    permissions.map((permission) => [
      normalizePermissionId(permission.id),
      normalizeLabel(permission.label),
    ])
  )
}

export function buildUserPermissionAuditSummary(
  log: AuditLog,
  permissionLabelMap: ReadonlyMap<string, string>
): UserPermissionAuditSummary {
  const beforePermissionIds = normalizePermissionIdList(
    readDiffValue(log, 'beforePermissions')
  )
  const afterPermissionIds = normalizePermissionIdList(
    readDiffValue(log, 'afterPermissions')
  )
  const source = normalizeAuditString(readDiffValue(log, 'source'))
  const reason = normalizeAuditString(readDiffValue(log, 'reason'))
  const grantedBy = normalizeAuditString(readDiffValue(log, 'grantedBy'))
  const target = parseTarget(readDiffValue(log, 'target'))

  const beforePermissionIdSet = new Set(beforePermissionIds)
  const afterPermissionIdSet = new Set(afterPermissionIds)

  const addedPermissionIds = afterPermissionIds.filter(
    (permissionId) => !beforePermissionIdSet.has(permissionId)
  )
  const removedPermissionIds = beforePermissionIds.filter(
    (permissionId) => !afterPermissionIdSet.has(permissionId)
  )

  return {
    beforePermissionIds,
    afterPermissionIds,
    beforePermissionItems: mapPermissionBadgeItems(
      beforePermissionIds,
      permissionLabelMap
    ),
    afterPermissionItems: mapPermissionBadgeItems(
      afterPermissionIds,
      permissionLabelMap
    ),
    addedPermissionItems: mapPermissionBadgeItems(
      addedPermissionIds,
      permissionLabelMap
    ),
    removedPermissionItems: mapPermissionBadgeItems(
      removedPermissionIds,
      permissionLabelMap
    ),
    source,
    reason,
    grantedBy,
    target,
  }
}
