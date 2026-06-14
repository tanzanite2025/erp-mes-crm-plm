import { reportRemoteLog } from '@/lib/log-drain'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

const isDev = import.meta.env.DEV

function shouldEmit(level: LogLevel) {
  if (isDev) return true
  return level === 'warn' || level === 'error'
}

function formatMessage(scope: string, message: string) {
  return `[${scope}] ${message}`
}

function emit(
  level: LogLevel,
  scope: string,
  message: string,
  context?: unknown
) {
  if (!shouldEmit(level)) return

  const formatted = formatMessage(scope, message)

  if (level === 'warn' || level === 'error') {
    reportRemoteLog({
      level,
      scope,
      message,
      context,
      timestamp: new Date().toISOString(),
    })
  }

  switch (level) {
    case 'debug':
      if (context === undefined) {
        console.debug(formatted)
      } else {
        console.debug(formatted, context)
      }
      return
    case 'info':
      if (context === undefined) {
        console.info(formatted)
      } else {
        console.info(formatted, context)
      }
      return
    case 'warn':
      if (context === undefined) {
        console.warn(formatted)
      } else {
        console.warn(formatted, context)
      }
      return
    case 'error':
      if (context === undefined) {
        console.error(formatted)
      } else {
        console.error(formatted, context)
      }
  }
}

export function createLogger(scope: string) {
  return {
    debug(message: string, context?: LogContext | unknown) {
      emit('debug', scope, message, context)
    },
    info(message: string, context?: LogContext | unknown) {
      emit('info', scope, message, context)
    },
    warn(message: string, context?: LogContext | unknown) {
      emit('warn', scope, message, context)
    },
    error(message: string, context?: LogContext | unknown) {
      emit('error', scope, message, context)
    },
  }
}
