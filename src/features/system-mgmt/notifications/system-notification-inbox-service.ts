import { apiFetch } from '@/lib/api-client'
import type { NotificationPriority, NotificationType } from './types'

export type SystemNotificationInboxScope = 'active' | 'history'

export interface SystemNotificationInboxMessage {
  id: string
  sourceCode: string
  targetId: string
  approvalRequestId?: string
  type: NotificationType
  priority: NotificationPriority
  title: string
  content: string
  actionUrl?: string
  timestamp: string
  updatedAt: string
  readAt: string | null
  archivedAt: string | null
  resolvedAt: string | null
  expiresAt: string | null
  isRead: boolean
  isArchived: boolean
  isResolved: boolean
  requiresAction: boolean
  metadata: Record<string, unknown>
}

export interface SystemNotificationInboxPage {
  items: SystemNotificationInboxMessage[]
  unreadCount: number
  total: number
  nextCursor?: string
}

export const systemNotificationInboxQueryRoot = [
  'system-notification-inbox',
] as const

export function fetchCurrentAccountSystemNotificationInbox(
  scope: SystemNotificationInboxScope = 'active',
  cursor = '',
  limit = 30
) {
  const search = new URLSearchParams({ scope, cursor, limit: String(limit) })
  return apiFetch<SystemNotificationInboxPage>(
    `/message-center/inbox?${search}`
  )
}

export function updateCurrentAccountSystemNotificationInboxState(
  ids: string[],
  action: 'read' | 'archive'
) {
  return apiFetch<void>('/message-center/inbox/state', {
    method: 'POST',
    body: JSON.stringify({ ids, action }),
  })
}
