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
