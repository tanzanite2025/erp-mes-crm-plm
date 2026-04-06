import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { useNotificationStore as useLegacyNotificationStore } from '@/stores/notification-store'
import { useNotificationStore as useSystemNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import type { NotificationPriority } from '@/features/system-mgmt/notifications/types'
import { useScanActivityStore } from '@/features/dashboard/stores/scan-activity-store'
import { createLogger } from '@/lib/logger'

const logger = createLogger('useNotifications')

function resolvePriorityFromSeverity(severity: string): NotificationPriority {
  const normalized = severity.toLowerCase()
  if (normalized === 'critical') return 'critical'
  if (normalized === 'error') return 'error'
  if (normalized === 'warning') return 'warning'
  return 'info'
}

export const useNotifications = () => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const incrementUnread = useLegacyNotificationStore((state) => state.incrementUnread)
  const addSystemMessage = useSystemNotificationStore((state) => state.addMessage)
  const archiveSystemMessage = useSystemNotificationStore((state) => state.archiveMessage)
  const addScanActivity = useScanActivityStore((state) => state.addFromPayload)
  const queryClient = useQueryClient()
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!user?.id || !accessToken) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/v1/ws?token=${encodeURIComponent(accessToken)}`

    const connect = () => {
      const socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        logger.info('WebSocket connected')
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'SYSTEM_STATUS_CHANGE') {
            queryClient.invalidateQueries({ queryKey: ['system-health-integrity'] })
            return
          }

          if (data.type === 'CACHE_INVALIDATE' && data.module) {
            const jitterDelay = Math.floor(Math.random() * 1500)
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: [data.module] })
            }, jitterDelay)
            return
          }

          if (data.module === 'Scan' && data.action === 'INGESTED' && data.payload) {
            addScanActivity(data.payload)
            return
          }

          if (data.module === 'System' && data.action === 'ALERT') {
            const payload = data.payload || {}
            const description = payload.description || '检测到基础设施异常，请立即查看系统监控页面'
            const fingerprint = String(payload.fingerprint || payload.id || payload.name || payload.description || Date.now())

            addSystemMessage({
              type: 'SYSTEM_NOTICE',
              title: data.title || '系统自诊断异常',
              content: description,
              priority: resolvePriorityFromSeverity(String(payload.severity || 'critical')),
              metadata: {
                uniqueKey: `system_alert_${fingerprint}`,
                fingerprint,
                severity: payload.severity,
                startsAt: payload.startsAt,
                status: payload.status || 'firing',
              },
            })

            queryClient.invalidateQueries({ queryKey: ['service-status'] })
            queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['diagnostic-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['sidebar-system-active-alerts'] })
            return
          }

          if (data.module === 'System' && data.action === 'ALERT_RESOLVED') {
            const payload = data.payload || {}
            const fingerprint = String(payload.fingerprint || payload.id || '')
            if (fingerprint) {
              const uniqueKey = `system_alert_${fingerprint}`
              const target = useSystemNotificationStore
                .getState()
                .messages.find((m) => m.metadata?.uniqueKey === uniqueKey && !m.isArchived)

              if (target) {
                archiveSystemMessage(target.id)
              }
            }

            queryClient.invalidateQueries({ queryKey: ['active-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['diagnostic-alerts'] })
            queryClient.invalidateQueries({ queryKey: ['sidebar-system-active-alerts'] })
            return
          }

          if (data.targetUser === user.id) {
            toast.info(data.title || '您有新的系统消息', {
              description: data.payload?.reason || data.payload?.description || '请前往中心查看详情',
              duration: 10000,
            })
            incrementUnread()
          }
        } catch (error) {
          logger.error('WebSocket message parse failed', error)
        }
      }

      socket.onclose = (event) => {
        logger.warn(`WebSocket disconnected (Code: ${event.code}, Reason: ${event.reason || 'None'}). Retry scheduled in 5 seconds`)
        setTimeout(connect, 5000)
      }

      socket.onerror = (err) => {
        logger.error('WebSocket socket error', err)
        socket.close()
      }
    }

    connect()

    return () => {
      socketRef.current?.close()
    }
  }, [user?.id, accessToken, incrementUnread, queryClient, addSystemMessage, archiveSystemMessage, addScanActivity])

  return null
}
