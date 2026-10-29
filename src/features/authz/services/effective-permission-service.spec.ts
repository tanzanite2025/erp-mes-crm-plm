import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  processAndNotifyPermissions,
  resolveOrSyncPermissionIds,
  syncIdentitySnapshotFromProfile,
} from './effective-permission-service'

const serviceMocks = vi.hoisted(() => {
  const authState = {
    user: null as {
      id: string
      accountNo: string
      employeeId?: string
      email: string
      username: string
      permissions?: string[]
      exp: number
    } | null,
    accessToken: '',
    isIdentitySynced: false,
    setUser: vi.fn(),
    setIsIdentitySynced: vi.fn(),
  }

  authState.setUser.mockImplementation((user) => {
    authState.user = user
  })
  authState.setIsIdentitySynced.mockImplementation((isIdentitySynced) => {
    authState.isIdentitySynced = isIdentitySynced
  })

  return {
    apiFetch: vi.fn(),
    authState,
  }
})

vi.mock('@/lib/api-client', () => ({
  apiFetch: serviceMocks.apiFetch,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => serviceMocks.authState,
  },
}))

describe('effective permission service', () => {
  beforeEach(() => {
    serviceMocks.apiFetch.mockReset()
    serviceMocks.authState.user = null
    serviceMocks.authState.accessToken = ''
    serviceMocks.authState.isIdentitySynced = false
    serviceMocks.authState.setUser.mockClear()
    serviceMocks.authState.setIsIdentitySynced.mockClear()
  })

  it('normalizes and deduplicates backend permission ids', async () => {
    await expect(
      processAndNotifyPermissions([' USER_VIEW ', 'user_view', '', 'Menu_Org'])
    ).resolves.toEqual(['user_view', 'menu_org'])
  })

  it('uses an already synchronized in-memory permission snapshot', async () => {
    serviceMocks.authState.user = {
      id: 'user-1',
      accountNo: 'EMP-001',
      email: 'user@example.com',
      username: 'user',
      permissions: [' USER_VIEW ', 'menu_org'],
      exp: Date.now() + 60_000,
    }
    serviceMocks.authState.isIdentitySynced = true

    await expect(
      resolveOrSyncPermissionIds(['ignored-preset'])
    ).resolves.toEqual(['user_view', 'menu_org'])
    expect(serviceMocks.apiFetch).not.toHaveBeenCalled()
  })

  it('coalesces concurrent profile syncs and replaces stale identity fields', async () => {
    serviceMocks.authState.accessToken = 'token'
    serviceMocks.authState.user = {
      id: 'user-1',
      accountNo: 'EMP-OLD',
      employeeId: 'EMP-OLD',
      email: 'user@example.com',
      username: 'user',
      permissions: ['stale_permission'],
      exp: Date.now() + 60_000,
    }
    serviceMocks.apiFetch.mockResolvedValue({
      id: 'user-1',
      username: 'user',
      employeeId: ' EMP-001 ',
      permissions: [' PERM_MANAGE ', 'perm_manage', 'user_view'],
    })

    const [first, second] = await Promise.all([
      syncIdentitySnapshotFromProfile(),
      syncIdentitySnapshotFromProfile(),
    ])

    expect(first).toEqual(['perm_manage', 'user_view'])
    expect(second).toEqual(first)
    expect(serviceMocks.apiFetch).toHaveBeenCalledTimes(1)
    expect(serviceMocks.apiFetch).toHaveBeenCalledWith('/auth/snapshot', {
      ignoreBreaker: true,
    })
    expect(serviceMocks.authState.user).toMatchObject({
      employeeId: 'EMP-001',
      permissions: ['perm_manage', 'user_view'],
    })
    expect(serviceMocks.authState.setIsIdentitySynced).toHaveBeenCalledWith(
      true
    )
  })

  it('does not restore identity when an earlier snapshot arrives after password-change logout', async () => {
    serviceMocks.authState.accessToken = 'old-password-token'
    let resolveOldSnapshot!: (profile: unknown) => void
    serviceMocks.apiFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldSnapshot = resolve
      })
    )
    const pendingSnapshot = syncIdentitySnapshotFromProfile()
    const rejectedSnapshot = expect(pendingSnapshot).rejects.toMatchObject({
      kind: 'auth_required',
    })
    serviceMocks.authState.accessToken = ''
    resolveOldSnapshot({
      id: 'old-account',
      username: 'operator',
      permissions: ['user_edit'],
    })
    await rejectedSnapshot
    expect(serviceMocks.authState.user).toBeNull()
    expect(serviceMocks.authState.setUser).not.toHaveBeenCalled()
    expect(serviceMocks.authState.setIsIdentitySynced).not.toHaveBeenCalled()
  })

  it('separates in-flight snapshot requests for old and new sign-in credentials', async () => {
    let resolveOldSnapshot!: (profile: unknown) => void
    let resolveNewSnapshot!: (profile: unknown) => void
    serviceMocks.apiFetch
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOldSnapshot = resolve
        })
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveNewSnapshot = resolve
        })
      )
    serviceMocks.authState.accessToken = 'old-password-token'
    const oldSnapshot = syncIdentitySnapshotFromProfile()
    const rejectedOldSnapshot = expect(oldSnapshot).rejects.toMatchObject({
      kind: 'auth_required',
    })
    serviceMocks.authState.accessToken = 'new-password-token'
    const newSnapshot = syncIdentitySnapshotFromProfile()
    resolveOldSnapshot({
      id: 'old-account',
      username: 'old',
      permissions: ['perm_manage'],
    })
    await rejectedOldSnapshot
    const concurrentNewSnapshot = syncIdentitySnapshotFromProfile()
    expect(serviceMocks.apiFetch).toHaveBeenCalledTimes(2)
    resolveNewSnapshot({
      id: 'new-account',
      username: 'new',
      permissions: ['user_view'],
    })
    expect(await newSnapshot).toEqual(['user_view'])
    expect(await concurrentNewSnapshot).toEqual(['user_view'])
    expect(serviceMocks.authState.user).toMatchObject({
      id: 'new-account',
      permissions: ['user_view'],
    })
  })

  it('rejects identity snapshots for a different account without updating permissions', async () => {
    serviceMocks.authState.accessToken = 'token'
    serviceMocks.authState.user = {
      id: 'current-account',
      username: 'current',
      accountNo: 'current',
      email: '',
      exp: Date.now() + 60_000,
    }
    serviceMocks.apiFetch.mockResolvedValueOnce({
      id: 'another-account',
      username: 'another',
      permissions: ['perm_manage'],
    })
    await expect(syncIdentitySnapshotFromProfile()).rejects.toMatchObject({
      kind: 'invalid_response',
    })
    expect(serviceMocks.authState.setUser).not.toHaveBeenCalled()
    expect(serviceMocks.authState.setIsIdentitySynced).not.toHaveBeenCalled()
  })
})
