import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api-client'
import { ApprovalService } from '@/features/approval/services/approval-service'
import { hasSystemAlertConsumer, withDynamicBadges } from './sidebar-nav-utils'
import type { NavGroup } from './types'

type SidebarSystemAlert = {
  id?: string
}

export function useSidebarNavGroupsWithBadges(
  navGroups: NavGroup[]
): NavGroup[] {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const { data: approvals = [] } = useQuery({
    queryKey: ['my-approvals', user?.id, user?.permissions],
    queryFn: () => {
      const currentIdentity = useAuthStore.getState()
      return currentIdentity.accessToken &&
        currentIdentity.user?.id === user?.id
        ? ApprovalService.getMyApprovals()
        : []
    },
    enabled: Boolean(
      accessToken && user?.id && user.permissions?.includes('menu_approval')
    ),
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
    staleTime: 5_000,
    retry: false,
    gcTime: 0,
  })
  const unreadApprovals = approvals.filter(
    (request) =>
      (request.status === 'PENDING' && request.approver1Id === user?.id) ||
      (request.status === 'APPROVED_L1' && request.approver2Id === user?.id)
  ).length
  const shouldWatchSystemAlerts = useMemo(
    () => navGroups.some((group) => hasSystemAlertConsumer(group.children)),
    [navGroups]
  )
  const { data: systemActiveAlerts = [] } = useQuery({
    queryKey: ['sidebar-system-active-alerts', user?.id],
    queryFn: () => {
      const currentIdentity = useAuthStore.getState()
      return currentIdentity.accessToken &&
        currentIdentity.user?.id === user?.id
        ? apiFetch<SidebarSystemAlert[]>('/system/status/alerts/active')
        : []
    },
    refetchInterval: (query) => {
      const error = query.state.error as { status?: number } | null
      return error?.status === 403 ? false : 10000
    },
    staleTime: 5000,
    retry: false,
    enabled: Boolean(accessToken && user?.id && shouldWatchSystemAlerts),
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
