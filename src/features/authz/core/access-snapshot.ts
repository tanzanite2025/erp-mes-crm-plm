import { parseIdList } from './permission-kernel'

export type AccessSnapshotLike = {
  role?: unknown
  effectiveRoles?: unknown
  permissions?: unknown
}

export function getSnapshotCompatibleRoleIds(snapshot?: AccessSnapshotLike | null): string[] {
  const primaryRoles = parseIdList(snapshot?.role)
  const effectiveRoles = parseIdList(snapshot?.effectiveRoles)
  return mergeIds(primaryRoles, effectiveRoles)
}

export function getSnapshotEffectiveRoleIds(snapshot?: AccessSnapshotLike | null): string[] {
  return parseIdList(snapshot?.effectiveRoles)
}

export function getSnapshotPermissionIds(snapshot?: AccessSnapshotLike | null): string[] {
  return parseIdList(snapshot?.permissions)
}

function mergeIds(primary: string[], secondary: string[]): string[] {
  const merged: string[] = []
  const seen = new Set<string>()

  ;[...primary, ...secondary].forEach((id) => {
    const normalized = id.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) return

    seen.add(normalized)
    merged.push(id.trim())
  })

  return merged
}
