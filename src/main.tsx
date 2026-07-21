import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
} from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { getErrorKind, getErrorStatus } from '@/lib/error-status'
import { handleServerError } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import { router } from '@/lib/router'
import { setAppRouter } from '@/lib/router-reference'
import { registerProductionResourceQueryClient } from '@/features/production-shared/services/production-resource-invalidation'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { LanguageProvider } from './context/language-provider'
import { ThemeProvider } from './context/theme-provider'
// Styles
import './styles/index.css'

const logger = createLogger('main')
const CHUNK_LOAD_RECOVERY_STORAGE_KEY = 'erp:chunk-load-recovery:last-at'
const CHUNK_LOAD_RECOVERY_WINDOW_MS = 30 * 1000

function getChunkLoadErrorMessage(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }
  if (typeof reason === 'string') {
    return reason
  }
  if (reason && typeof reason === 'object' && 'message' in reason) {
    return String((reason as { message?: unknown }).message ?? '')
  }
  return ''
}

function isChunkLoadError(reason: unknown): boolean {
  const message = getChunkLoadErrorMessage(reason)
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk \S+ failed/i.test(message)
  )
}

async function clearRuntimeShellCaches() {
  const cleanupTasks: Promise<unknown>[] = []

  if ('caches' in window) {
    cleanupTasks.push(
      window.caches
        .keys()
        .then((cacheKeys) =>
          Promise.all(
            cacheKeys.map((cacheKey) => window.caches.delete(cacheKey))
          )
        )
    )
  }

  if ('serviceWorker' in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(
            registrations.map((registration) => registration.unregister())
          )
        )
    )
  }

  await Promise.allSettled(cleanupTasks)
}

function recoverFromChunkLoadError(reason: unknown) {
  if (!import.meta.env.PROD || typeof window === 'undefined') {
    return
  }

  const now = Date.now()

  try {
    const lastRecoveryAt = Number(
      window.sessionStorage.getItem(CHUNK_LOAD_RECOVERY_STORAGE_KEY) ?? '0'
    )
    if (now - lastRecoveryAt < CHUNK_LOAD_RECOVERY_WINDOW_MS) {
      return
    }
    window.sessionStorage.setItem(CHUNK_LOAD_RECOVERY_STORAGE_KEY, String(now))
  } catch {
    // Private browsing/storage policy failures should not block recovery.
  }

  logger.warn('Detected stale application chunk, refreshing app shell', {
    reason: getChunkLoadErrorMessage(reason),
  })

  void clearRuntimeShellCaches().finally(() => {
    window.location.reload()
  })
}

if (import.meta.env.PROD && typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault()
      recoverFromChunkLoadError(event.reason)
    }
  })

  window.addEventListener('error', (event) => {
    const target = event.target
    const failedScriptUrl =
      target instanceof HTMLScriptElement ? target.src : ''
    if (
      isChunkLoadError(event.error) ||
      /\/assets\/.+\.js(?:\?|$)/.test(failedScriptUrl)
    ) {
      event.preventDefault()
      recoverFromChunkLoadError(event.error ?? failedScriptUrl)
    }
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (import.meta.env.DEV) {
          logger.debug('Query retry evaluated', { failureCount, error })
        }

        const status = getErrorStatus(error)
        const kind = getErrorKind(error)

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false
        if (
          kind === 'auth_required' ||
          kind === 'circuit_breaker' ||
          kind === 'invalid_response'
        )
          return false

        return ![401, 403].includes(status ?? 0)
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (getErrorStatus(error) === 304) {
          toast.error('Content not modified!')
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      const status = getErrorStatus(error)

      if (status === 401) {
        toast.error('Session expired!')
        useAuthStore.getState().reset()
        const redirect = `${router.history.location.href}`
        router.navigate({ to: '/sign-in', search: { redirect } })
      }

      if (status === 500) {
        toast.error('Internal Server Error!')
        // Only navigate to error page in production to avoid disrupting HMR in development
        if (import.meta.env.PROD) {
          router.navigate({ to: '/500' })
        }
      }
    },
  }),
})

registerProductionResourceQueryClient(queryClient)
setAppRouter(router)

// Update the router context with the real queryClient instance
router.update({
  context: {
    ...router.options.context,
    queryClient,
  },
})

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      logger.error('Service worker registration failed', error)
    })
  }

  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ThemeProvider>
            <FontProvider>
              <DirectionProvider>
                <RouterProvider router={router} />
              </DirectionProvider>
            </FontProvider>
          </ThemeProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
