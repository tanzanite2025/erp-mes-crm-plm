// @vitest-environment jsdom
import { createElement, type PropsWithChildren } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestUser } from '../test-factories'
import { useUserPermissionEditor } from './use-user-permission-editor'

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

vi.mock('../services/user-api', () => userApiMocks)
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@/features/authz/services/account-access-refresh-service', () => ({
  refreshCurrentAccountAccessSnapshotIfMutatedAccountMatches: vi
    .fn()
    .mockResolvedValue(false),
}))

function createPermissionEditorQueryEnvironment() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function PermissionEditorQueryWrapper({ children }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }

  return { queryClient, wrapper: PermissionEditorQueryWrapper }
}

function createSavedUserPermissionsResponse(permissionIds: string[]) {
  return {
    userId: 'user-1',
    username: 'operator',
    status: 'active',
    permissions: permissionIds.map((permissionId) => ({
      permissionId,
      source: 'manual',
    })),
    presetPermissions: [],
    effectivePermissions: [...permissionIds],
    total: permissionIds.length,
  }
}

describe('saved user permissions and permission loading failures', () => {
  beforeEach(() => {
    Object.values(userApiMocks).forEach((mock) => mock.mockReset())
  })

  it('blocks edits and saving after a read error, then restores saved grants after retry', async () => {
    userApiMocks.fetchUserPermissions.mockRejectedValueOnce(
      new Error('invalid response')
    )
    const { queryClient, wrapper } = createPermissionEditorQueryEnvironment()
    const { result, unmount } = renderHook(
      () =>
        useUserPermissionEditor({
          currentRow: createTestUser({ id: 'user-1' }),
          open: true,
        }),
      { wrapper }
    )

    await waitFor(() =>
      expect(result.current.hasPermissionsLoadError).toBe(true)
    )
    expect(result.current.canEditPermissions).toBe(false)
    act(() => {
      result.current.selectAll()
      result.current.togglePermissionIDs(['menu_dashboard'])
    })
    await act(async () => {
      await result.current.save()
    })
    expect(userApiMocks.replaceUserPermissions).not.toHaveBeenCalled()
    expect(result.current.hasUnsavedChanges).toBe(false)

    userApiMocks.fetchUserPermissions.mockResolvedValue(
      createSavedUserPermissionsResponse(['menu_purchase'])
    )
    await act(async () => {
      await result.current.retryLoadingPermissions()
    })
    await waitFor(() => expect(result.current.canEditPermissions).toBe(true))
    expect(result.current.effectivePermissionIDSet).toEqual(
      new Set(['menu_purchase'])
    )
    expect(result.current.hasUnsavedChanges).toBe(false)
    unmount()
    queryClient.clear()
  })

  it('retains saved checkmarks after refetch and after closing and reopening the editor', async () => {
    let savedPermissionIds = ['menu_purchase']
    userApiMocks.fetchUserPermissions.mockImplementation(async () =>
      createSavedUserPermissionsResponse(savedPermissionIds)
    )
    userApiMocks.replaceUserPermissions.mockImplementation(
      async (_id, payload: { permissions: string[] }) => {
        savedPermissionIds = [...payload.permissions]
        return {
          userId: 'user-1',
          permissions: [...savedPermissionIds],
          changeSummary: { added: 1, removed: 0, unchanged: 1 },
        }
      }
    )
    const { queryClient, wrapper } = createPermissionEditorQueryEnvironment()
    const { result, rerender, unmount } = renderHook(
      ({ open }) =>
        useUserPermissionEditor({
          currentRow: createTestUser({ id: 'user-1' }),
          open,
        }),
      { wrapper, initialProps: { open: true } }
    )

    await waitFor(() => expect(result.current.canEditPermissions).toBe(true))
    act(() => result.current.togglePermissionIDs(['menu_dashboard']))
    await act(async () => {
      await result.current.save()
    })
    await waitFor(() => expect(result.current.hasUnsavedChanges).toBe(false))
    expect(result.current.effectivePermissionIDSet).toEqual(
      new Set(['menu_purchase', 'menu_dashboard'])
    )

    act(() => result.current.resetEditor())
    rerender({ open: false })
    rerender({ open: true })
    await waitFor(() =>
      expect(userApiMocks.fetchUserPermissions).toHaveBeenCalledTimes(3)
    )
    expect(result.current.effectivePermissionIDSet).toEqual(
      new Set(['menu_purchase', 'menu_dashboard'])
    )
    expect(result.current.presetPermissionIDSet.size).toBe(0)
    expect(result.current.hasUnsavedChanges).toBe(false)
    unmount()
    queryClient.clear()
  })
})
