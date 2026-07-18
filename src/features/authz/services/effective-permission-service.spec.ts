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

    await expect(resolveOrSyncPermissionIds(['ignored-role'])).resolves.toEqual(
      ['user_view', 'menu_org']
    )
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
})
