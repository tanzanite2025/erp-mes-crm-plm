import { useAuthStore } from '@/stores/auth-store'
import {
  hasAnyId,
  parseRequiredIds,
} from '@/features/authz/core/permission-kernel'
import { getAuthSessionPermissionIds } from '@/features/authz/utils/auth-session'

interface PermissionBoundaryProps {
  permission: string | string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionBoundary({
  permission,
  children,
  fallback = null,
}: PermissionBoundaryProps) {
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const isAllowed =
    isIdentitySynced &&
    hasAnyId(getAuthSessionPermissionIds(user), parseRequiredIds(permission))

  return <>{isAllowed ? children : fallback}</>
}
