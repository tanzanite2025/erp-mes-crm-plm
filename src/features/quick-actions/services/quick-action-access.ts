import type { AuthUser } from '@/stores/auth-store'
import { quickActionRegistry } from '../data/quick-action-registry'
import type { QuickActionDefinition } from '../types'

export function hasQuickActionPermission(user: AuthUser | null, requiredPermissions: string[]) {
  if (requiredPermissions.length === 0) return true
  const granted = new Set(user?.permissions ?? [])
  return requiredPermissions.every((permission) => granted.has(permission))
}

export function getAvailableQuickActions(user: AuthUser | null): QuickActionDefinition[] {
  return quickActionRegistry.filter((action) => action.enabled && hasQuickActionPermission(user, action.requiredPermissions))
}
