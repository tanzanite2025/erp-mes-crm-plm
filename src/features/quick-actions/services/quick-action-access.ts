import type { AuthUser } from '@/stores/auth-store'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { quickActionRegistry } from '../data/quick-action-registry'
import type { QuickActionDefinition } from '../types'

export function hasQuickActionPermission(
  user: AuthUser | null,
  requiredPermissions: string[]
) {
  if (requiredPermissions.length === 0) return true
  const granted = new Set(user?.permissions ?? [])
  return requiredPermissions.every((permission) => granted.has(permission))
}

export function getAvailableQuickActions(
  user: AuthUser | null
): QuickActionDefinition[] {
  return quickActionRegistry.filter((action) => {
    if (
      !action.enabled ||
      !hasQuickActionPermission(user, action.requiredPermissions)
    ) {
      return false
    }

    if (!action.permissionPath) {
      return true
    }

    return matchesPathPermissionProjection(user, action.permissionPath)
  })
}
