// @vitest-environment jsdom
import { createElement, type PropsWithChildren } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { systemNotificationInboxQueryRoot } from './system-notification-inbox-service'
import {
  useSystemNotificationInbox,
  useSystemNotificationInboxAccountCacheLifecycle,
  useSystemNotificationInboxStateMutation,
} from './use-system-notification-inbox'

const api = vi.hoisted(() => ({ fetchInbox: vi.fn(), updateState: vi.fn() }))
vi.mock('./system-notification-inbox-service', () => ({
  systemNotificationInboxQueryRoot: ['system-notification-inbox'],
  fetchCurrentAccountSystemNotificationInbox: api.fetchInbox,
  updateCurrentAccountSystemNotificationInboxState: api.updateState,
}))
vi.mock('@/stores/auth-store', async () => {
  const { create } = await import('zustand')
  return { useAuthStore: create(() => ({ user: null, accessToken: '' })) }
})

function createNotificationInboxTestAccount(id: string): AuthUser {
  return {
    id,
    username: id,
    accountNo: id,
    email: '',
    exp: 9999999999,
    permissions: ['menu_quality'],
  }
}

function createNotificationInboxDeviceTestEnvironment() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  function NotificationInboxDeviceQueryProvider({
    children,
  }: PropsWithChildren) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
  return { queryClient, wrapper: NotificationInboxDeviceQueryProvider }
}

describe('server inbox account isolation and device synchronization', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    onlineManager.setOnline(true)
    useAuthStore.setState({
      user: createNotificationInboxTestAccount('account-a'),
      accessToken: 'isolated-test-token',
    })
  })
  afterEach(() => {
    cleanup()
    onlineManager.setOnline(true)
  })

  it('clears personal cache and loads the new account after an identity switch', async () => {
    api.fetchInbox.mockImplementation(async () => ({
      items: [{ id: useAuthStore.getState().user?.id }],
      total: 1,
      unreadCount: 1,
    }))
    const device = createNotificationInboxDeviceTestEnvironment()
    const hook = renderHook(
      () => {
        useSystemNotificationInboxAccountCacheLifecycle()
        return useSystemNotificationInbox()
      },
      { wrapper: device.wrapper }
    )
    await waitFor(() =>
      expect(hook.result.current.data?.items[0].id).toBe('account-a')
    )
    act(() =>
      useAuthStore.setState({
        user: createNotificationInboxTestAccount('account-b'),
      })
    )
    await waitFor(() =>
      expect(hook.result.current.data?.items[0].id).toBe('account-b')
    )
    expect(
      device.queryClient.getQueriesData({
        queryKey: [...systemNotificationInboxQueryRoot, 'account-a'],
      })
    ).toEqual([])
    act(() => useAuthStore.setState({ user: null, accessToken: '' }))
    expect(hook.result.current.data).toBeUndefined()
    expect(
      device.queryClient.getQueriesData({
        queryKey: [...systemNotificationInboxQueryRoot, 'account-b'],
      })
    ).toEqual([])
    device.queryClient.clear()
  })

  it('keeps cached unread state when saving fails and reconciles another device from the server', async () => {
    let serverUnread = 1
    api.fetchInbox.mockImplementation(async () => ({
      items: [],
      total: 1,
      unreadCount: serverUnread,
    }))
    api.updateState
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementation(async () => {
        serverUnread = 0
      })
    const firstDevice = createNotificationInboxDeviceTestEnvironment()
    const secondDevice = createNotificationInboxDeviceTestEnvironment()
    const first = renderHook(
      () => ({
        inbox: useSystemNotificationInbox(),
        mutation: useSystemNotificationInboxStateMutation(),
      }),
      { wrapper: firstDevice.wrapper }
    )
    const second = renderHook(() => useSystemNotificationInbox(), {
      wrapper: secondDevice.wrapper,
    })
    await waitFor(() =>
      expect(first.result.current.inbox.data?.unreadCount).toBe(1)
    )
    await waitFor(() => expect(second.result.current.data?.unreadCount).toBe(1))
    await act(async () => {
      await expect(
        first.result.current.mutation.mutateAsync({
          ids: ['receipt-1'],
          action: 'read',
        })
      ).rejects.toThrow('offline')
    })
    expect(first.result.current.inbox.data?.unreadCount).toBe(1)
    await act(async () => {
      await first.result.current.mutation.mutateAsync({
        ids: ['receipt-1'],
        action: 'read',
      })
    })
    await waitFor(() =>
      expect(first.result.current.inbox.data?.unreadCount).toBe(0)
    )
    expect(api.updateState).toHaveBeenLastCalledWith(['receipt-1'], 'read')
    await act(async () => {
      await second.result.current.refetch()
    })
    await waitFor(() => expect(second.result.current.data?.unreadCount).toBe(0))
    firstDevice.queryClient.clear()
    secondDevice.queryClient.clear()
  })
})
