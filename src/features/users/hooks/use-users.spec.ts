// @vitest-environment jsdom
import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestUser } from '../test-factories'
import type { UserPermissionsResponse } from '../data/schema'
import {
  USER_PERMISSIONS_QUERY_KEY,
  useUserMutations,
  useUserPermissionsQuery,
} from './use-users'

const userApiMocks = vi.hoisted(() => ({
  bindUserEmployee: vi.fn(),
  bulkDeleteUsers: vi.fn(),
  createUser: vi.fn(),
  deleteUser: vi.fn(),
  fetchUserAccessSnapshot: vi.fn(),
  fetchUserOptions: vi.fn(),
  fetchUserPermissions: vi.fn(),
  fetchUsers: vi.fn(),
  patchUser: vi.fn(),
  replaceUser: vi.fn(),
  replaceUserPermissions: vi.fn(),
  unbindUserEmployee: vi.fn(),
}))

const accessRefreshMocks = vi.hoisted(() => ({
  refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches: vi.fn(),
}))

vi.mock('../services/user-api', () => userApiMocks)
vi.mock('@/features/authz/services/account-access-refresh-service', () => ({
  refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches:
    accessRefreshMocks.refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches,
}))
vi.mock('@/lib/react-query-mutation', () => ({
  buildMutationOptions: ({
    onSuccess,
    onError,
  }: {
    onSuccess?: (...args: unknown[]) => unknown
    onError?: (...args: unknown[]) => unknown
  }) => ({
    onError,
    onSuccess,
  }),
}))

function createQueryEnvironment() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function QueryWrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return { queryClient, wrapper: QueryWrapper }
}

function createQueryWrapper() {
  return createQueryEnvironment().wrapper
}

describe('user query and mutation guards', () => {
  beforeEach(() => {
    Object.values(userApiMocks).forEach((mock) => mock.mockReset())
    accessRefreshMocks.refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches.mockReset()
    accessRefreshMocks.refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches.mockResolvedValue(
      false
    )
  })

  it('normalizes a user id before loading sensitive permissions', async () => {
    userApiMocks.fetchUserPermissions.mockResolvedValue({
      userId: 'user-1',
      username: 'buyer',
      status: 'active',
      permissions: [],
      presetPermissions: [],
      effectivePermissions: [],
      total: 0,
    })

    const { result } = renderHook(() => useUserPermissionsQuery('  user-1  '), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(userApiMocks.fetchUserPermissions).toHaveBeenCalledWith('user-1')
  })

  it('does not query permissions for an empty user id', async () => {
    const { result } = renderHook(() => useUserPermissionsQuery('   '), {
      wrapper: createQueryWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'))
    expect(userApiMocks.fetchUserPermissions).not.toHaveBeenCalled()
  })

  it('blocks every destructive mutation for a protected account', async () => {
    const protectedUser = createTestUser({
      id: 'admin-id',
      username: 'admin',
      isProtected: true,
    })
    const { result } = renderHook(() => useUserMutations(), {
      wrapper: createQueryWrapper(),
    })

    await expect(
      result.current.updateMutation.mutateAsync({
        id: protectedUser.id,
        delta: {},
        version: protectedUser.version,
        user: protectedUser,
      })
    ).rejects.toThrow('Cannot modify protected system account')
    await expect(
      result.current.replaceMutation.mutateAsync({
        id: protectedUser.id,
        data: {
          username: protectedUser.username,
          phoneNumber: protectedUser.phoneNumber,
          firstName: protectedUser.firstName,
          lastName: protectedUser.lastName,
          status: protectedUser.status,
        },
        user: protectedUser,
      })
    ).rejects.toThrow('Cannot replace protected system account')
    await expect(
      result.current.deleteMutation.mutateAsync({
        id: protectedUser.id,
        user: protectedUser,
      })
    ).rejects.toThrow('Cannot delete protected system account')

    expect(userApiMocks.patchUser).not.toHaveBeenCalled()
    expect(userApiMocks.replaceUser).not.toHaveBeenCalled()
    expect(userApiMocks.deleteUser).not.toHaveBeenCalled()
  })

  it('refreshes the current identity snapshot after account access mutations succeed', async () => {
    const targetUser = createTestUser({
      id: 'user-1',
      permissionPresetId: 'buyer',
      version: 5,
    })
    userApiMocks.patchUser.mockResolvedValue(targetUser)
    userApiMocks.replaceUserPermissions.mockResolvedValue({
      userId: targetUser.id,
      permissions: ['user_view'],
      changeSummary: { added: 1, removed: 0, unchanged: 0 },
    })

    const { result } = renderHook(() => useUserMutations(), {
      wrapper: createQueryWrapper(),
    })

    await result.current.updateMutation.mutateAsync({
      id: targetUser.id,
      delta: { permissionPresetId: { o: 'buyer', n: 'manager' } },
      version: targetUser.version,
      user: targetUser,
    })
    await result.current.replaceUserPermissionsMutation.mutateAsync({
      id: targetUser.id,
      payload: {
        permissions: ['user_view'],
        reason: 'test',
      },
    })

    expect(
      accessRefreshMocks.refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches
    ).toHaveBeenNthCalledWith(1, targetUser.id)
    expect(
      accessRefreshMocks.refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches
    ).toHaveBeenNthCalledWith(2, targetUser.id)
  })

  it('syncs cached user permissions after a replacement succeeds', async () => {
    const { queryClient, wrapper } = createQueryEnvironment()
    queryClient.setQueryData<UserPermissionsResponse>(
      [...USER_PERMISSIONS_QUERY_KEY, 'user-1'],
      {
        userId: 'user-1',
        username: 'buyer',
        status: 'active',
        permissions: [],
        presetPermissions: [],
        effectivePermissions: [],
        total: 0,
      }
    )
    userApiMocks.replaceUserPermissions.mockResolvedValue({
      userId: 'user-1',
      permissions: ['page_purchase_orders', 'menu_purchase'],
      changeSummary: { added: 2, removed: 0, unchanged: 0 },
    })

    const { result } = renderHook(() => useUserMutations(), { wrapper })

    await result.current.replaceUserPermissionsMutation.mutateAsync({
      id: 'user-1',
      payload: {
        permissions: ['page_purchase_orders', 'menu_purchase'],
        reason: 'test',
      },
    })

    expect(
      queryClient.getQueryData<UserPermissionsResponse>([
        ...USER_PERMISSIONS_QUERY_KEY,
        'user-1',
      ])
    ).toEqual(
      expect.objectContaining({
        permissions: [
          expect.objectContaining({ permissionId: 'page_purchase_orders' }),
          expect.objectContaining({ permissionId: 'menu_purchase' }),
        ],
        effectivePermissions: ['page_purchase_orders', 'menu_purchase'],
        total: 2,
      })
    )
  })
})
