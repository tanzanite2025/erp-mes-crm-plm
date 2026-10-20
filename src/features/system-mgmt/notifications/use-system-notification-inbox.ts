import { useEffect, useSyncExternalStore } from 'react'
import {
  onlineManager,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  fetchCurrentAccountSystemNotificationInbox,
  systemNotificationInboxQueryRoot,
  updateCurrentAccountSystemNotificationInboxState,
  type SystemNotificationInboxScope,
} from './system-notification-inbox-service'

export function useSystemNotificationInbox(
  scope: SystemNotificationInboxScope = 'active',
  cursor = ''
) {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const permissionKey = [...(user?.permissions ?? [])].sort().join(',')
  return useQuery({
    queryKey: [
      ...systemNotificationInboxQueryRoot,
      user?.id,
      permissionKey,
      scope,
      cursor,
    ],
    queryFn: () => fetchCurrentAccountSystemNotificationInbox(scope, cursor),
    enabled: Boolean(user?.id && accessToken),
    staleTime: 5_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: 1,
    gcTime: 0,
  })
}

export function useSystemNotificationInboxStateMutation() {
  const queryClient = useQueryClient()
  const accountID = useAuthStore((state) => state.user?.id)
  return useMutation({
    networkMode: 'always',
    mutationFn: ({
      ids,
      action,
    }: {
      ids: string[]
      action: 'read' | 'archive'
    }) => updateCurrentAccountSystemNotificationInboxState(ids, action),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...systemNotificationInboxQueryRoot, accountID],
      }),
  })
}

// Remove cached personal messages on identity/permission changes, including
// requests still in flight. There is no persisted browser message collection.
export function useSystemNotificationInboxAccountCacheLifecycle() {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      useAuthStore.subscribe((next, previous) => {
        if (
          next.user?.id !== previous.user?.id ||
          JSON.stringify(next.user?.permissions) !==
            JSON.stringify(previous.user?.permissions) ||
          (!next.accessToken && previous.accessToken)
        ) {
          void queryClient.cancelQueries({
            queryKey: systemNotificationInboxQueryRoot,
          })
          queryClient.removeQueries({
            queryKey: systemNotificationInboxQueryRoot,
          })
        }
      }),
    [queryClient]
  )
}

export function useSystemNotificationInboxConnectionStatus() {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true
  )
}
