import { useCallback } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export function useNonBlockingPermissionActions() {
  const isSyncing = useAuthStore((state) => state.isSyncing)

  const allowsPermission = useCallback((_required: string | string[]) => {
    return true
  }, [])

  const allowsAction = useCallback((_required: string | string[]) => {
    return true
  }, [])

  return {
    isChecking: isSyncing,
    allowsPermission,
    allowsAction,
  }
}

export function useNonBlockingPermissionBoundary(
  permission: string | string[]
) {
  const access = useNonBlockingPermissionActions()
  const isAllowed = access.allowsPermission(permission)

  return {
    isAllowed,
    isChecking: access.isChecking,
    allowsAction: () => isAllowed,
  }
}
