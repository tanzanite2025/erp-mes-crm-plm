import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'
import { ensureAuthenticatedRouteSession } from './ensure-authenticated-route-session'

const guardMocks = vi.hoisted(() => {
  const authState = {
    user: null as {
      id: string
      accountNo: string
      email: string
      username: string
      permissions?: string[]
      exp: number
    } | null,
    accessToken: '',
    isIdentitySynced: false,
    reset: vi.fn(),
  }

  return {
    authState,
    redirect: vi.fn((options) => ({
      kind: 'redirect',
      options,
    })),
    waitForAuthHydration: vi.fn(),
    syncIdentitySnapshotFromProfile: vi.fn(),
    matchesPathPermissionProjection: vi.fn(),
  }
})

vi.mock('@tanstack/react-router', () => ({
  redirect: guardMocks.redirect,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => guardMocks.authState,
  },
  waitForAuthHydration: guardMocks.waitForAuthHydration,
}))

vi.mock('@/features/authz/services/effective-permission-service', () => ({
  syncIdentitySnapshotFromProfile: guardMocks.syncIdentitySnapshotFromProfile,
}))

vi.mock('./route-access', () => ({
  matchesPathPermissionProjection: guardMocks.matchesPathPermissionProjection,
}))

describe('ensureAuthenticatedRouteSession', () => {
  beforeEach(() => {
    guardMocks.authState.user = null
    guardMocks.authState.accessToken = ''
    guardMocks.authState.isIdentitySynced = false
    guardMocks.authState.reset.mockClear()
    guardMocks.redirect.mockClear()
    guardMocks.waitForAuthHydration.mockReset()
    guardMocks.waitForAuthHydration.mockResolvedValue(undefined)
    guardMocks.syncIdentitySnapshotFromProfile.mockReset()
    guardMocks.matchesPathPermissionProjection.mockReset()
  })

  it('redirects anonymous visitors to sign-in', async () => {
    await expect(
      ensureAuthenticatedRouteSession('/dashboard/overview')
    ).rejects.toMatchObject({
      kind: 'redirect',
      options: {
        to: '/sign-in',
        search: { redirect: '/dashboard/overview' },
        replace: true,
      },
    })

    expect(guardMocks.syncIdentitySnapshotFromProfile).not.toHaveBeenCalled()
  })

  it('clears a stale token-only session when snapshot sync cannot rehydrate identity', async () => {
    guardMocks.authState.accessToken = 'stale-token'
    guardMocks.syncIdentitySnapshotFromProfile.mockRejectedValue(
      createApiClientError({
        kind: 'http',
        message: '[API_ERROR] 500 Internal Server Error',
        endpoint: '/auth/snapshot',
        status: 500,
      })
    )

    await expect(
      ensureAuthenticatedRouteSession('/dashboard/overview')
    ).rejects.toMatchObject({
      kind: 'redirect',
      options: {
        to: '/sign-in',
        search: { redirect: '/dashboard/overview' },
        replace: true,
      },
    })

    expect(guardMocks.authState.reset).toHaveBeenCalledTimes(1)
  })

  it('continues with the rehydrated user after snapshot sync succeeds', async () => {
    guardMocks.authState.accessToken = 'valid-token'
    guardMocks.syncIdentitySnapshotFromProfile.mockImplementation(async () => {
      guardMocks.authState.user = {
        id: 'user-1',
        accountNo: 'EMP-001',
        email: '',
        username: 'admin',
        permissions: ['tab_dashboard_overview'],
        exp: Date.now() + 60_000,
      }
      guardMocks.authState.isIdentitySynced = true
      return ['tab_dashboard_overview']
    })
    guardMocks.matchesPathPermissionProjection.mockReturnValue(true)

    await expect(
      ensureAuthenticatedRouteSession('/dashboard/overview')
    ).resolves.toBeUndefined()

    expect(guardMocks.matchesPathPermissionProjection).toHaveBeenCalledWith(
      guardMocks.authState.user,
      '/dashboard/overview'
    )
  })

  it('redirects to 403 when the synchronized user does not match route permissions', async () => {
    guardMocks.authState.accessToken = 'valid-token'
    guardMocks.authState.user = {
      id: 'user-1',
      accountNo: 'EMP-001',
      email: '',
      username: 'admin',
      permissions: [],
      exp: Date.now() + 60_000,
    }
    guardMocks.authState.isIdentitySynced = true
    guardMocks.matchesPathPermissionProjection.mockReturnValue(false)

    await expect(
      ensureAuthenticatedRouteSession('/dashboard/overview')
    ).rejects.toMatchObject({
      kind: 'redirect',
      options: {
        to: '/403',
        replace: true,
      },
    })
  })
})
