import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api-client'

export const XDFC_EFFECTIVE_PERMISSIONS_EVENT =
  'xdfc_effective_permissions_updated'
let inFlightProfileSync: Promise<string[]> | null = null

type ProfilePayload = {
  id?: string
  username?: string
  email?: string
  employeeId?: string
  permissions?: string[]
}

function normalizePermissionId(value: string): string {
  return value.trim().toLowerCase()
}

function toUniquePermissionIds(permissionIds: string[]): string[] {
  return Array.from(
    new Set(
      permissionIds.map((id) => normalizePermissionId(id)).filter(Boolean)
    )
  )
}

function areStringArraysEqualAsSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false

  const rightSet = new Set(right)
  return left.every((value) => rightSet.has(value))
}

/**
 * 权限层“零缓存”改造：移除本地 Storage 读写。
 * 所有有效权限仅在内存 Store 中维护，并通过 /profile 接口实时对齐。
 */

export async function processAndNotifyPermissions(
  permissionIds: string[]
): Promise<string[]> {
  const normalized = toUniquePermissionIds(permissionIds)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(XDFC_EFFECTIVE_PERMISSIONS_EVENT))
  }

  return normalized
}

export async function syncIdentitySnapshotFromProfile(): Promise<string[]> {
  if (inFlightProfileSync) return inFlightProfileSync

  inFlightProfileSync = (async () => {
    const profile = await apiFetch<ProfilePayload>('/auth/snapshot', {
      ignoreBreaker: true,
    })
    const normalizedPermissions = await processAndNotifyPermissions(
      profile.permissions || []
    )

    const state = useAuthStore.getState()
    const currentUser = state.user
    if (currentUser) {
      const currentPermissions = toUniquePermissionIds(
        currentUser.permissions || []
      )
      const samePermissions = areStringArraysEqualAsSet(
        currentPermissions,
        normalizedPermissions
      )
      const nextEmployeeId = profile.employeeId?.trim() || undefined
      const sameEmployeeId =
        (currentUser.employeeId || '').trim() === (nextEmployeeId || '')

      if (!samePermissions || !sameEmployeeId) {
        state.setUser(
          {
            ...currentUser,
            employeeId: nextEmployeeId,
            permissions: normalizedPermissions,
          },
          'profile_sync'
        )
      }
    } else if (profile.id && profile.username) {
      state.setUser(
        {
          id: profile.id,
          accountNo: profile.employeeId || profile.id,
          employeeId: profile.employeeId?.trim() || undefined,
          email: profile.email || '',
          username: profile.username,
          permissions: normalizedPermissions,
          exp: Date.now() + 24 * 60 * 60 * 1000,
        },
        'profile_rehydrate'
      )
    }

    state.setIsIdentitySynced(true)

    return normalizedPermissions
  })()

  try {
    return await inFlightProfileSync
  } finally {
    inFlightProfileSync = null
  }
}

export async function resolveOrSyncPermissionIds(
  _roleIds: string[]
): Promise<string[]> {
  const state = useAuthStore.getState()
  const hasAccessToken = !!state.accessToken
  const isIdentitySynced = state.isIdentitySynced
  const currentPermissions = toUniquePermissionIds(
    state.user?.permissions || []
  )

  if (isIdentitySynced && currentPermissions.length > 0) {
    return currentPermissions
  }

  if (hasAccessToken) {
    const syncedPermissions = await syncIdentitySnapshotFromProfile()
    if (Array.isArray(syncedPermissions)) return syncedPermissions
    throw new Error(
      '[CRITICAL] Received invalid permission payload from server.'
    )
  }

  if (currentPermissions.length > 0) {
    return currentPermissions
  }

  const syncedPermissions = await syncIdentitySnapshotFromProfile()
  if (Array.isArray(syncedPermissions)) return syncedPermissions
  throw new Error('[CRITICAL] Received invalid permission payload from server.')
}

export async function resolveStoredPermissionSet(
  roleIds: string[]
): Promise<Set<string>> {
  return new Set(await resolveOrSyncPermissionIds(roleIds))
}
