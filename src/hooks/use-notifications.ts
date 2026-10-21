import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { refreshCurrentAccountAccessSnapshotAfterRealtimeInvalidation } from '@/features/authz/services/account-access-refresh-service'
import { useScanActivityStore } from '@/features/dashboard/stores/scan-activity-store'
import { systemNotificationInboxQueryRoot } from '@/features/system-mgmt/notifications/system-notification-inbox-service'
import { useSystemNotificationInboxAccountCacheLifecycle } from '@/features/system-mgmt/notifications/use-system-notification-inbox'

const logger = createLogger('useNotifications')
const WS_RECONNECT_DELAY_MS = 5000

type WSTicketPayload = {
  ticket: string
  expiresAt: string
}

type RealtimeNotificationEnvelope = {
  id?: string
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

function isAccountAccessSnapshotInvalidation(
  data: RealtimeNotificationEnvelope
) {
  return (
    data.module === 'AccessControl' &&
    data.action === 'IDENTITY_SNAPSHOT_INVALIDATED'
  )
}

export const useNotifications = () => {
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  useSystemNotificationInboxAccountCacheLifecycle()
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
        void queryClient.invalidateQueries({
          queryKey: [...systemNotificationInboxQueryRoot, user.id],
        })
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

          if (isAccountAccessSnapshotInvalidation(data)) {
            const payload = isRecord(data.payload) ? data.payload : {}
            void refreshCurrentAccountAccessSnapshotAfterRealtimeInvalidation(
              readString(payload, 'accountId')
            )
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

          if (
            data.module === 'NotificationInbox' &&
            data.action === 'CHANGED'
          ) {
            if (data.targetUser !== user.id) return
            void queryClient.invalidateQueries({
              queryKey: [...systemNotificationInboxQueryRoot, user.id],
            })
            for (const queryKey of [
              ['my-approvals'],
              ['quality_standard'],
              ['quality_standards'],
              ['active-alerts'],
              ['diagnostic-alerts'],
              ['sidebar-system-active-alerts'],
            ]) {
              void queryClient.invalidateQueries({ queryKey })
            }
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
  }, [user, accessToken, queryClient, addScanActivity])

  return null
}
