import { useCallback, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import {
  hasAnyId,
  parseRequiredIds,
} from '@/features/authz/core/permission-kernel'
import { getAuthSessionPermissionIds } from '@/features/authz/utils/auth-session'

export function usePermissionActions() {
  const isSyncing = useAuthStore((state) => state.isSyncing)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const user = useAuthStore((state) => state.user)
  const permissionIds = useMemo(() => getAuthSessionPermissionIds(user), [user])

  const allowsPermission = useCallback(
    (required: string | string[]) =>
      isIdentitySynced && hasAnyId(permissionIds, parseRequiredIds(required)),
    [isIdentitySynced, permissionIds]
  )

  const allowsAction = allowsPermission

  return {
    isChecking: isSyncing || !isIdentitySynced,
    allowsPermission,
    allowsAction,
  }
}

export function usePermissionBoundary(permission: string | string[]) {
  const access = usePermissionActions()
  const isAllowed = access.allowsPermission(permission)

  return {
    isAllowed,
    isChecking: access.isChecking,
    allowsAction: () => isAllowed,
  }
}
