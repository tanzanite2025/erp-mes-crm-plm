type RemoteLogLevel = 'warn' | 'error'

type RemoteLogPayload = {
  level: RemoteLogLevel
  scope: string
  message: string
  context?: unknown
  url?: string
  userAgent?: string
  timestamp: string
}

const remoteLogUrl = import.meta.env.VITE_LOG_DRAIN_URL?.trim()
const remoteLogToken = import.meta.env.VITE_LOG_DRAIN_TOKEN?.trim()
const remoteLogEnabled = import.meta.env.VITE_ENABLE_REMOTE_LOGGING === 'true'

function canSendRemoteLog(level: RemoteLogLevel) {
  if (!remoteLogEnabled || !remoteLogUrl) return false
  return level === 'warn' || level === 'error'
}

export function reportRemoteLog(payload: RemoteLogPayload) {
  if (!canSendRemoteLog(payload.level)) return

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (remoteLogToken) {
    headers.Authorization = `Bearer ${remoteLogToken}`
  }

  const body = JSON.stringify({
    ...payload,
    url: typeof window !== 'undefined' ? window.location.href : payload.url,
    userAgent:
      typeof navigator !== 'undefined'
        ? navigator.userAgent
        : payload.userAgent,
  })

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    const blob = new Blob([body], { type: 'application/json' })
    navigator.sendBeacon(remoteLogUrl, blob)
    return
  }

  void fetch(remoteLogUrl, {
    method: 'POST',
    headers,
    body,
    keepalive: true,
  }).catch(() => {
    return
  })
}
