import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api-client'
import { createApiClientError } from '@/lib/api-error'

export const XDFC_EFFECTIVE_PERMISSIONS_EVENT =
  'xdfc_effective_permissions_updated'
let inFlightProfileSync: {
  accessToken: string
  promise: Promise<string[]>
} | null = null

type ProfilePayload = {
  id?: string
  username?: string
  email?: string
  employeeId?: string
  permissionPresetId?: string
  presetPermissionIds?: string[]
  directPermissionIds?: string[]
  permissions?: string[]
  diagnostics?: string[]
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
 * 所有有效权限仅在内存 Store 中维护，并通过 /auth/snapshot 接口实时对齐。
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
  const requestAccessToken = useAuthStore.getState().accessToken
  if (!requestAccessToken) {
    throw createApiClientError({
      kind: 'auth_required',
      message: 'Sign in before synchronizing account identity.',
      endpoint: '/auth/snapshot',
    })
  }
  if (inFlightProfileSync?.accessToken === requestAccessToken)
    return inFlightProfileSync.promise

  const synchronization = (async () => {
    const profile = await apiFetch<ProfilePayload>('/auth/snapshot', {
      ignoreBreaker: true,
    })
    const state = useAuthStore.getState()
    if (state.accessToken !== requestAccessToken) {
      throw createApiClientError({
        kind: 'auth_required',
        message: 'The identity response belongs to a previous sign-in session.',
        endpoint: '/auth/snapshot',
      })
    }
    const currentUser = state.user
    if (currentUser && profile.id !== currentUser.id) {
      throw createApiClientError({
        kind: 'invalid_response',
        message: 'The identity response does not match the signed-in account.',
        endpoint: '/auth/snapshot',
      })
    }
    // Do not yield between checking the session and updating identity.
    const normalizedPermissions = toUniquePermissionIds(
      profile.permissions || []
    )
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

    return processAndNotifyPermissions(normalizedPermissions)
  })()
  const pendingSynchronization = {
    accessToken: requestAccessToken,
    promise: synchronization,
  }
  inFlightProfileSync = pendingSynchronization

  try {
    return await synchronization
  } finally {
    if (inFlightProfileSync === pendingSynchronization)
      inFlightProfileSync = null
  }
}

export async function resolveOrSyncPermissionIds(
  _permissionPresetIds: string[]
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
  permissionPresetIds: string[]
): Promise<Set<string>> {
  return new Set(await resolveOrSyncPermissionIds(permissionPresetIds))
}
