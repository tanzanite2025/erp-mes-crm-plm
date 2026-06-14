import { getSnapshotPermissionIds } from '@/features/authz/core/access-snapshot'

export type AuthSessionUserLike = {
  permissions?: unknown
}

export function getAuthSessionPermissionIds(
  user?: AuthSessionUserLike | null
): string[] {
  return getSnapshotPermissionIds(user)
}
