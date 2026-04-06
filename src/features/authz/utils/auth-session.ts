import {
  getSnapshotCompatibleRoleIds,
  getSnapshotEffectiveRoleIds,
  getSnapshotPermissionIds,
} from '@/features/authz/core/access-snapshot'

export type AuthSessionUserLike = {
  role?: unknown
  effectiveRoles?: unknown
  permissions?: unknown
}

export function getAuthSessionCompatibleRoleIds(user?: AuthSessionUserLike | null): string[] {
  return getSnapshotCompatibleRoleIds(user)
}

export function getAuthSessionEffectiveRoleIds(user?: AuthSessionUserLike | null): string[] {
  return getSnapshotEffectiveRoleIds(user)
}

export function getAuthSessionPermissionIds(user?: AuthSessionUserLike | null): string[] {
  return getSnapshotPermissionIds(user)
}
