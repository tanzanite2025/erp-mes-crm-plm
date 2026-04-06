import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiFetchMock, getStateMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getStateMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: getStateMock,
  },
}))

import { syncIdentitySnapshotFromProfile } from './effective-permission-service'

describe('effective-permission-service regression', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
    getStateMock.mockReset()
    Reflect.set(globalThis, 'window', {
      dispatchEvent: vi.fn(),
    })
  })

  it('syncIdentitySnapshotFromProfile requests /auth/snapshot and updates store from backend payload', async () => {
    const setUser = vi.fn()
    const setIsIdentitySynced = vi.fn()

    getStateMock.mockReturnValue({
      user: {
        id: 'u-1',
        accountNo: 'EMP-OLD',
        email: 'legacy@example.com',
        username: 'legacy',
        role: ['legacy_role'],
        permissions: ['legacy_permission'],
        exp: Date.now() + 1000,
      },
      accessToken: 'token-1',
      isIdentitySynced: false,
      setUser,
      setIsIdentitySynced,
    })

    apiFetchMock.mockResolvedValue({
      id: 'u-1',
      username: 'legacy',
      employeeId: 'EMP-NEW',
      email: 'new@example.com',
      role: ['finance_manager'],
      effectiveRoles: ['finance_manager'],
      permissions: ['MENU_ORG', 'permission_user_view', 'permission_user_view'],
    })

    const permissions = await syncIdentitySnapshotFromProfile()

    expect(apiFetchMock).toHaveBeenCalledWith('/auth/snapshot', { ignoreBreaker: true })
    expect(permissions).toEqual(['menu_org', 'permission_user_view'])
    expect(setUser).toHaveBeenCalledTimes(1)
    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: ['finance_manager'],
        permissions: ['menu_org', 'permission_user_view'],
      }),
      'profile_sync',
    )
    expect(setIsIdentitySynced).toHaveBeenCalledWith(true)
  })

  it('ignores legacy role fallback when effectiveRoles is missing from snapshot payload', async () => {
    const setUser = vi.fn()
    const setIsIdentitySynced = vi.fn()

    getStateMock.mockReturnValue({
      user: {
        id: 'u-2',
        accountNo: 'EMP-OLD-2',
        email: 'legacy2@example.com',
        username: 'legacy2',
        role: ['legacy_role'],
        permissions: ['legacy_permission'],
        exp: Date.now() + 1000,
      },
      accessToken: 'token-2',
      isIdentitySynced: false,
      setUser,
      setIsIdentitySynced,
    })

    apiFetchMock.mockResolvedValue({
      id: 'u-2',
      username: 'legacy2',
      employeeId: 'EMP-NEW-2',
      email: 'new2@example.com',
      role: ['finance_manager'],
      permissions: ['MENU_ORG'],
    })

    await syncIdentitySnapshotFromProfile()

    expect(setUser).toHaveBeenCalledWith(
      expect.objectContaining({
        role: [],
        permissions: ['menu_org'],
      }),
      'profile_sync',
    )
    expect(setIsIdentitySynced).toHaveBeenCalledWith(true)
  })
})
