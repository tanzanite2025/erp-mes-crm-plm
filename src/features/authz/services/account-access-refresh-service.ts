import { useAuthStore } from '@/stores/auth-store'
import { safeAsync } from '@/lib/safe-catch'
import { syncIdentitySnapshotFromProfile } from './effective-permission-service'

const ACCOUNT_ACCESS_REFRESH_SCOPE = 'AccountAccessRefreshService'

function getCurrentAuthenticatedAccountId(): string {
  return useAuthStore.getState().user?.id.trim() || ''
}

async function refreshCurrentAccountAccessSnapshot(): Promise<boolean> {
  const state = useAuthStore.getState()
  if (!state.accessToken || !state.user?.id.trim()) {
    return false
  }

  state.setIsIdentitySynced(false)
  const syncedPermissions = await safeAsync(
    () => syncIdentitySnapshotFromProfile(),
    `${ACCOUNT_ACCESS_REFRESH_SCOPE}.refreshCurrentAccountAccessSnapshot`,
    { silentUI: true }
  )

  return Array.isArray(syncedPermissions)
}

export async function refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
  mutatedAccountId: string | undefined
): Promise<boolean> {
  const normalizedMutatedAccountId = mutatedAccountId?.trim() || ''
  if (!normalizedMutatedAccountId) {
    return false
  }

  if (getCurrentAuthenticatedAccountId() !== normalizedMutatedAccountId) {
    return false
  }

  return refreshCurrentAccountAccessSnapshot()
}

export async function refreshCurrentAccountAccessSnapshotAfterPermissionPresetMutation(): Promise<boolean> {
  return refreshCurrentAccountAccessSnapshot()
}

export async function refreshCurrentAccountAccessSnapshotAfterRealtimeInvalidation(
  invalidatedAccountId: string | undefined
): Promise<boolean> {
  return refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
    invalidatedAccountId
  )
}
