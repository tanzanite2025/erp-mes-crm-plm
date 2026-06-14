import { parseIdList } from './permission-kernel'

export type AccessSnapshotLike = {
  permissions?: unknown
}

export function getSnapshotPermissionIds(
  snapshot?: AccessSnapshotLike | null
): string[] {
  return parseIdList(snapshot?.permissions)
}
