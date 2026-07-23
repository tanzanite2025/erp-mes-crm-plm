import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore, type AuthUser } from '@/stores/auth-store'
import { useNotificationStore as useLegacyNotificationStore } from '@/stores/notification-store'
import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { useScanActivityStore } from '@/features/dashboard/stores/scan-activity-store'
import { useNotificationStore as useSystemNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import type {
  NotificationPriority,
  NotificationType,
} from '@/features/system-mgmt/notifications/types'

const logger = createLogger('useNotifications')
const WS_RECONNECT_DELAY_MS = 5000

type WSTicketPayload = {
  ticket: string
  expiresAt: string
}

type RealtimeNotificationEnvelope = {
  type?: string
  module?: string
  action?: string
  title?: string
  targetUser?: string
  payload?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function readString(source: unknown, ...keys: string[]) {
  if (!isRecord(source)) return ''
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function resolvePriorityFromSeverity(severity: string): NotificationPriority {
  const normalized = severity.toLowerCase()
  if (normalized === 'critical') return 'critical'
  if (normalized === 'error') return 'error'
  if (normalized === 'warning') return 'warning'
  return 'info'
}

function isPermissionNotificationTarget(targetUser: string) {
  return targetUser.toLowerCase().startsWith('permission:')
}

function isCurrentUserNotificationTarget(
  targetUser: string,
  user: AuthUser | null
) {
  const userKeys = [user?.id, user?.username, user?.accountNo]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  return userKeys.includes(targetUser.trim())
}

function shouldSurfaceRealtimeNotification(
  data: RealtimeNotificationEnvelope,
  user: AuthUser | null
) {
  const targetUser = readString(data, 'targetUser')
  return (
    !targetUser ||
    isCurrentUserNotificationTarget(targetUser, user) ||
    isPermissionNotificationTarget(targetUser)
  )
}

function resolveRealtimeNotificationType(
  moduleName: string,
  payload: Record<string, unknown>
): NotificationType {
  if (moduleName === 'Approval') return 'SYSTEM_NOTICE'

  const sourceCode = readString(payload, 'sourceCode').toUpperCase()
  if (sourceCode === 'QUALITY_STANDARD') return 'QUALITY_STANDARD_EVENT'
  if (sourceCode === 'BOM_ENGINEERING' || sourceCode === 'BOM_MANUFACTURING') {
    return 'BOM_EVENT'
  }
  if (sourceCode === 'PRODUCTION_TASK') return 'TASK_ASSIGNED'
  if (sourceCode === 'PRODUCTION_PLAN') return 'SYSTEM_NOTICE'
  return 'ORDER_EVENT'
}

function buildRealtimeNotificationContent(
  data: RealtimeNotificationEnvelope,
  payload: Record<string, unknown>
) {
  const explicitContent = readString(
    payload,
    'reason',
    'description',
    'content',
    'message'
  )
  if (explicitContent) return explicitContent

  const nextStatus = readString(payload, 'status', 'nextStatus')
  if (nextStatus) return `业务状态已更新为 ${nextStatus}，请及时查看。`

  const action = readString(data, 'action')
  if (action) return `收到 ${action} 业务通知，请前往通知中心查看详情。`

  return '收到新的业务通知，请前往通知中心查看详情。'
}

function buildRealtimeNotificationUniqueKey(
  data: RealtimeNotificationEnvelope,
  payload: Record<string, unknown>
) {
  const eventKey = readString(payload, 'eventKey')
  if (eventKey) return eventKey

  return [
    readString(data, 'module'),
    readString(data, 'action'),
    readString(payload, 'sourceCode'),
    readString(payload, 'ruleId'),
    readString(payload, 'segmentId'),
    readString(payload, 'commandId'),
    readString(payload, 'targetId', 'orderId', 'id'),
  ]
    .filter(Boolean)
    .join('_')
}

function buildRealtimeNotificationMetadata(
  data: RealtimeNotificationEnvelope,
  payload: Record<string, unknown>
) {
  const nestedMetadata = isRecord(payload.metadata) ? payload.metadata : {}
  const uniqueKey = buildRealtimeNotificationUniqueKey(data, payload)
  return {
    ...nestedMetadata,
    ...payload,
    notificationModule: readString(data, 'module'),
    notificationAction: readString(data, 'action'),
    targetUser: readString(data, 'targetUser'),
    ...(uniqueKey ? { uniqueKey } : {}),
  }
}

function isBusinessRealtimeNotification(data: RealtimeNotificationEnvelope) {
  return data.module === 'Workflow' || data.module === 'Approval'
}

export const useNotifications = () => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const incrementUnread = useLegacyNotificationStore(
    (state) => state.incrementUnread
  )
  const addSystemMessage = useSystemNotificationStore(
    (state) => state.addMessage
  )
  const archiveSystemMessage = useSystemNotificationStore(
    (state) => state.archiveMessage
  )
  const addScanActivity = useScanActivityStore((state) => state.addFromPayload)
  const queryClient = useQueryClient()
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!user?.id || !accessToken) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let cancelled = false

    const scheduleReconnect = () => {
      if (cancelled) return
      reconnectTimer = setTimeout(() => {
        void connect()
      }, WS_RECONNECT_DELAY_MS)
    }

    const connect = async () => {
      let ticketResponse: WSTicketPayload
      try {
        ticketResponse = await apiFetch<WSTicketPayload>('/auth/ws-ticket', {
          method: 'POST',
          suppressErrorStatuses: [401],
        })
      } catch (error) {
        logger.error('WebSocket ticket request failed', error)
        scheduleReconnect()
        return
      }

      if (cancelled) return

      const wsUrl = `${protocol}//${window.location.host}/api/v1/ws?ticket=${encodeURIComponent(ticketResponse.ticket)}`
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        logger.info('WebSocket connected')
      }

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          const data: RealtimeNotificationEnvelope = isRecord(parsed)
            ? parsed
            : {}

          if (data.type === 'SYSTEM_STATUS_CHANGE') {
            queryClient.invalidateQueries({
              queryKey: ['system-health-integrity'],
            })
            return
          }

          if (data.type === 'CACHE_INVALIDATE' && data.module) {
            const jitterDelay = Math.floor(Math.random() * 1500)
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: [data.module] })
            }, jitterDelay)
            return
          }

          if (
            data.module === 'Scan' &&
            data.action === 'INGESTED' &&
            data.payload
          ) {
            addScanActivity(data.payload)
            return
          }

          if (data.module === 'System' && data.action === 'ALERT') {
            const payload = isRecord(data.payload) ? data.payload : {}
            const description =
              readString(payload, 'description') ||
              '检测到基础设施异常，请立即查看系统监控页面'
            const fingerprint = String(
              readString(payload, 'fingerprint', 'id', 'name', 'description') ||
                Date.now()
            )
            const severity = readString(payload, 'severity') || 'critical'

            addSystemMessage({
              type: 'SYSTEM_NOTICE',
              title: data.title || '系统自诊断异常',
              content: description,
              priority: resolvePriorityFromSeverity(severity),
              metadata: {
                uniqueKey: `system_alert_${fingerprint}`,
                fingerprint,
                severity,
                startsAt: readString(payload, 'startsAt') || undefined,
                status: readString(payload, 'status') || 'firing',
              },
            })

            queryClient.invalidateQueries({ queryKey: ['service-status'] })
            queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['diagnostic-alerts'] })
            queryClient.invalidateQueries({
              queryKey: ['sidebar-system-active-alerts'],
            })
            return
          }

          if (data.module === 'System' && data.action === 'ALERT_RESOLVED') {
            const payload = isRecord(data.payload) ? data.payload : {}
            const fingerprint = readString(payload, 'fingerprint', 'id')
            if (fingerprint) {
              const uniqueKey = `system_alert_${fingerprint}`
              const target = useSystemNotificationStore
                .getState()
                .messages.find(
                  (m) => m.metadata?.uniqueKey === uniqueKey && !m.isArchived
                )

              if (target) {
                archiveSystemMessage(target.id)
              }
            }

            queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['diagnostic-alerts'] })
            queryClient.invalidateQueries({
              queryKey: ['sidebar-system-active-alerts'],
            })
            return
          }

          if (isBusinessRealtimeNotification(data)) {
            const payload = isRecord(data.payload) ? data.payload : {}
            const targetUser = readString(data, 'targetUser')
            const title = readString(data, 'title') || '新的业务通知'

            if (!shouldSurfaceRealtimeNotification(data, user)) {
              return
            }

            addSystemMessage({
              type: resolveRealtimeNotificationType(
                readString(data, 'module'),
                payload
              ),
              title,
              content: buildRealtimeNotificationContent(data, payload),
              priority: resolvePriorityFromSeverity(
                readString(payload, 'priority', 'severity')
              ),
              targetUsers:
                targetUser && !isPermissionNotificationTarget(targetUser)
                  ? [targetUser]
                  : undefined,
              actionUrl: readString(payload, 'actionUrl', 'targetLink'),
              metadata: buildRealtimeNotificationMetadata(data, payload),
              ruleId: readString(payload, 'ruleId'),
              segmentId: readString(payload, 'segmentId'),
              commandId: readString(payload, 'commandId'),
            })

            toast.info(title, {
              description: buildRealtimeNotificationContent(data, payload),
              duration: 10000,
            })
            incrementUnread()
            return
          }

          if (
            data.targetUser &&
            isCurrentUserNotificationTarget(data.targetUser, user)
          ) {
            const payload = isRecord(data.payload) ? data.payload : {}
            toast.info(data.title || '您有新的系统消息', {
              description:
                readString(payload, 'reason', 'description') ||
                '请前往中心查看详情',
              duration: 10000,
            })
            incrementUnread()
          }
        } catch (error) {
          logger.error('WebSocket message parse failed', error)
        }
      }

      socket.onclose = (event) => {
        logger.warn(
          `WebSocket disconnected (Code: ${event.code}, Reason: ${event.reason || 'None'}). Retry scheduled in 5 seconds`
        )
        if (socketRef.current === socket) {
          socketRef.current = null
        }
        scheduleReconnect()
      }

      socket.onerror = (err) => {
        logger.error('WebSocket socket error', err)
        socket.close()
      }
    }

    void connect()

    return () => {
      cancelled = true
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [
    user?.id,
    accessToken,
    incrementUnread,
    queryClient,
    addSystemMessage,
    archiveSystemMessage,
    addScanActivity,
  ])

  return null
}
