import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  refreshCurrentAccountAccessSnapshotAfterRealtimeInvalidation,
  refreshCurrentAccountAccessSnapshotAfterPermissionPresetMutation,
  refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches,
} from './account-access-refresh-service'

const refreshMocks = vi.hoisted(() => {
  const authState = {
    user: null as { id: string } | null,
    accessToken: '',
    setIsIdentitySynced: vi.fn(),
  }

  return {
    authState,
    syncIdentitySnapshotFromProfile: vi.fn(),
  }
})

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => refreshMocks.authState,
  },
}))

vi.mock('@/lib/safe-catch', () => ({
  safeAsync: async <T>(fn: () => Promise<T>) => {
    try {
      return await fn()
    } catch {
      return undefined
    }
  },
}))

vi.mock('./effective-permission-service', () => ({
  syncIdentitySnapshotFromProfile: refreshMocks.syncIdentitySnapshotFromProfile,
}))

describe('account access refresh service', () => {
  beforeEach(() => {
    refreshMocks.authState.user = null
    refreshMocks.authState.accessToken = ''
    refreshMocks.authState.setIsIdentitySynced.mockClear()
    refreshMocks.syncIdentitySnapshotFromProfile.mockReset()
  })

  it('does not refresh when a different account was mutated', async () => {
    refreshMocks.authState.user = { id: 'current-user' }
    refreshMocks.authState.accessToken = 'token'

    await expect(
      refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches('other-user')
    ).resolves.toBe(false)

    expect(refreshMocks.authState.setIsIdentitySynced).not.toHaveBeenCalled()
    expect(refreshMocks.syncIdentitySnapshotFromProfile).not.toHaveBeenCalled()
  })

  it('refreshes the current account snapshot after the current account changes', async () => {
    refreshMocks.authState.user = { id: 'current-user' }
    refreshMocks.authState.accessToken = 'token'
    refreshMocks.syncIdentitySnapshotFromProfile.mockResolvedValue([
      'user_view',
    ])

    await expect(
      refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches(
        ' current-user '
      )
    ).resolves.toBe(true)

    expect(refreshMocks.authState.setIsIdentitySynced).toHaveBeenCalledWith(
      false
    )
    expect(refreshMocks.syncIdentitySnapshotFromProfile).toHaveBeenCalledTimes(
      1
    )
  })

  it('refreshes the current account after a permission preset mutation', async () => {
    refreshMocks.authState.user = { id: 'current-user' }
    refreshMocks.authState.accessToken = 'token'
    refreshMocks.syncIdentitySnapshotFromProfile.mockResolvedValue([
      'perm_manage',
    ])

    await expect(
      refreshCurrentAccountAccessSnapshotAfterPermissionPresetMutation()
    ).resolves.toBe(true)

    expect(refreshMocks.authState.setIsIdentitySynced).toHaveBeenCalledWith(
      false
    )
    expect(refreshMocks.syncIdentitySnapshotFromProfile).toHaveBeenCalledTimes(
      1
    )
  })

  it('leaves the session marked unsynced when immediate refresh fails', async () => {
    refreshMocks.authState.user = { id: 'current-user' }
    refreshMocks.authState.accessToken = 'token'
    refreshMocks.syncIdentitySnapshotFromProfile.mockRejectedValue(
      new Error('snapshot failed')
    )

    await expect(
      refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches('current-user')
    ).resolves.toBe(false)

    expect(refreshMocks.authState.setIsIdentitySynced).toHaveBeenCalledWith(
      false
    )
    expect(refreshMocks.syncIdentitySnapshotFromProfile).toHaveBeenCalledTimes(
      1
    )
  })

  it('refreshes the current account after a realtime invalidation event targets it', async () => {
    refreshMocks.authState.user = { id: 'current-user' }
    refreshMocks.authState.accessToken = 'token'
    refreshMocks.syncIdentitySnapshotFromProfile.mockResolvedValue([
      'perm_manage',
    ])

    await expect(
      refreshCurrentAccountAccessSnapshotAfterRealtimeInvalidation(
        ' current-user '
      )
    ).resolves.toBe(true)

    expect(refreshMocks.authState.setIsIdentitySynced).toHaveBeenCalledWith(
      false
    )
    expect(refreshMocks.syncIdentitySnapshotFromProfile).toHaveBeenCalledTimes(
      1
    )
  })
})
