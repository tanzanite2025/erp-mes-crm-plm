import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNotificationStore } from '@/stores/notification-store'
import { apiFetch } from '@/lib/api-client'
import { hasSystemAlertConsumer, withDynamicBadges } from './sidebar-nav-utils'
import type { NavGroup } from './types'

type SidebarSystemAlert = {
  id?: string
}

export function useSidebarNavGroupsWithBadges(
  navGroups: NavGroup[]
): NavGroup[] {
  const { unreadApprovals } = useNotificationStore()
  const shouldWatchSystemAlerts = useMemo(
    () => navGroups.some((group) => hasSystemAlertConsumer(group.children)),
    [navGroups]
  )
  const { data: systemActiveAlerts = [] } = useQuery({
    queryKey: ['sidebar-system-active-alerts'],
    queryFn: () =>
      apiFetch<SidebarSystemAlert[]>('/system/status/alerts/active'),
    refetchInterval: (query) => {
      const error = query.state.error as { status?: number } | null
      return error?.status === 403 ? false : 10000
    },
    staleTime: 5000,
    retry: false,
    enabled: shouldWatchSystemAlerts,
  })
  const systemAlertCount = systemActiveAlerts.length

  return useMemo(
    () =>
      navGroups.map((group) => ({
        ...group,
        children: withDynamicBadges(
          group.children,
          unreadApprovals,
          systemAlertCount
        ),
      })),
    [navGroups, systemAlertCount, unreadApprovals]
  )
}
