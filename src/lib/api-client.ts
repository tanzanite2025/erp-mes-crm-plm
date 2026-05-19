import { useAuthStore } from '@/stores/auth-store'
import { createLogger } from '@/lib/logger'
import { createApiClientError, isApiClientError } from '@/lib/api-error'

interface ExtendedRequestInit extends RequestInit {
  ignoreBreaker?: boolean
  suppressErrorStatuses?: number[]
}

interface ApiFetchError extends Error {
  status?: number
  code?: unknown
  isConflict?: boolean
}

const circuitBreaker = {
  failures: 0,
  tripped: false,
  tripTime: 0,
  resetTimeout: 5000,
  threshold: import.meta.env.DEV ? 50 : 10,
}

const logger = createLogger('apiFetch')

function shouldSuppressErrorLog(
  status: number | undefined,
  options: ExtendedRequestInit,
): boolean {
  if (!Number.isFinite(status)) return false
  return (
    Array.isArray(options.suppressErrorStatuses) &&
    options.suppressErrorStatuses.includes(status as number)
  )
}

let unauthorizedRedirectInFlight = false

function isPublicEndpoint(endpoint: string): boolean {
  return endpoint === '/auth/login' || endpoint === '/health'
}

function buildSignInRedirectHref(): string {
  if (typeof window === 'undefined') return '/sign-in'
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return `/sign-in?redirect=${encodeURIComponent(redirect)}`
}

function handleUnauthorizedSession(endpoint: string) {
  if (typeof window === 'undefined') return
  if (isPublicEndpoint(endpoint)) return
  if (unauthorizedRedirectInFlight) return

  unauthorizedRedirectInFlight = true
  useAuthStore.getState().reset()

  if (
    window.location.pathname.includes('/sign-in') ||
    window.location.pathname.includes('/forgot-password')
  ) {
    return
  }

  window.location.replace(buildSignInRedirectHref())
}

function isDiscoveryRequest(endpoint: string): boolean {
  return (
    endpoint.includes('/engineering/products') ||
    endpoint.includes('/logistics') ||
    endpoint.includes('/health')
  )
}

function nextTimeout(endpoint: string): number {
  if (!import.meta.env.DEV) {
    return 30000
  }
  if (isDiscoveryRequest(endpoint)) {
    return 30000
  }
  if (endpoint.includes('/sync') || endpoint.includes('/bulk-sync')) {
    return 45000
  }
  return 10000
}

export async function apiFetch<T>(
  endpoint: string,
  options: ExtendedRequestInit = {},
): Promise<T> {
  const requestMethod = (options.method || 'GET').toUpperCase()
  if (circuitBreaker.tripped && !options.ignoreBreaker) {
    if (Date.now() - circuitBreaker.tripTime > circuitBreaker.resetTimeout) {
      circuitBreaker.tripped = false
    } else {
      logger.error('Blocked request before fetch because circuit breaker is open', {
        endpoint,
        method: requestMethod,
        baseUrl: import.meta.env.VITE_API_BASE_URL || '',
      })
      throw createApiClientError({
        kind: 'circuit_breaker',
        message: `[CIRCUIT_BREAKER] Request blocked while the circuit breaker is open: ${endpoint}`,
        endpoint,
        details: {
          baseUrl: import.meta.env.VITE_API_BASE_URL || '',
        },
      })
    }
  }

  const start = performance.now()
  const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
  const token = useAuthStore.getState().accessToken
  const publicEndpoint = isPublicEndpoint(endpoint)

  if (!token && !publicEndpoint && !options.ignoreBreaker) {
    logger.error('Blocked request before fetch because auth token is missing', {
      endpoint,
      method: requestMethod,
      baseUrl,
      publicEndpoint,
    })
    throw createApiClientError({
      kind: 'auth_required',
      message: `[AUTH_REQUIRED] Unauthenticated API request blocked: ${endpoint}`,
      endpoint,
      details: {
        baseUrl,
        publicEndpoint,
      },
    })
  }

  const controller = new AbortController()
  const dynamicTimeout = nextTimeout(endpoint)
  const timeoutId = setTimeout(() => controller.abort(), dynamicTimeout)

  try {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${baseUrl}/api/v1${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const fetchEnd = performance.now()
    const serverTime = response.headers.get('X-Response-Time') || 'unknown'
    if (import.meta.env.DEV || fetchEnd - start > 1000) {
      logger.debug(`Performance sample for ${endpoint}`, {
        totalMs: Number((fetchEnd - start).toFixed(2)),
        serverTime: serverTime === 'unknown' ? 'N/A' : serverTime,
      })
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))

      if (response.status >= 400 && response.status < 500) {
        circuitBreaker.failures = 0
        circuitBreaker.tripped = false
      } else if (!isDiscoveryRequest(endpoint) && !options.ignoreBreaker) {
        circuitBreaker.failures++
        if (circuitBreaker.failures >= circuitBreaker.threshold) {
          circuitBreaker.tripped = true
          circuitBreaker.tripTime = Date.now()
          logger.warn('Circuit breaker tripped after repeated backend response errors', {
            endpoint,
            failures: circuitBreaker.failures,
          })
        }
      }

      const errorMessage =
        (errorData as { error?: string; message?: string }).error ||
        (errorData as { error?: string; message?: string }).message ||
        `[API_ERROR] ${response.status} ${response.statusText}`

      const error = createApiClientError({
        kind: 'http',
        message: errorMessage,
        endpoint,
        status: response.status,
        code: (errorData as { code?: unknown }).code,
        isConflict: response.status === 409,
        details: {
          method: requestMethod,
          statusText: response.statusText,
          errorData,
        },
      }) as ApiFetchError

      if (response.status === 401) {
        handleUnauthorizedSession(endpoint)
      }

      throw error
    }

    circuitBreaker.failures = 0
    circuitBreaker.tripped = false

    if (response.status === 204) {
      return null as T
    }

    const data = await response.json()
    return data as T
  } catch (err) {
    clearTimeout(timeoutId)

    if (err instanceof Error && err.name === 'AbortError') {
      if (!isDiscoveryRequest(endpoint) && !options.ignoreBreaker) {
        circuitBreaker.failures++
        if (circuitBreaker.failures >= circuitBreaker.threshold) {
          circuitBreaker.tripped = true
          circuitBreaker.tripTime = Date.now()
          logger.warn('Circuit breaker tripped after repeated request timeouts', {
            endpoint,
            failures: circuitBreaker.failures,
          })
        }
      }

      const seconds = parseFloat((dynamicTimeout / 1000).toFixed(1))
      throw createApiClientError({
        kind: 'timeout',
        message: `[TIMEOUT] Request ${endpoint} exceeded ${seconds} seconds.`,
        endpoint,
        details: {
          timeoutSeconds: seconds,
        },
        cause: err,
      })
    }

    let normalizedError: unknown = err

    if (
      normalizedError instanceof TypeError &&
      normalizedError.message === 'Failed to fetch'
    ) {
      const currentHost =
        typeof window !== 'undefined' ? window.location.hostname : 'unknown'
      let apiHost = 'unknown'
      try {
        if (baseUrl) {
          apiHost = new URL(baseUrl).hostname
        }
      } catch {
        apiHost = baseUrl || 'unknown'
      }

      if (!options.ignoreBreaker) {
        circuitBreaker.failures++
        if (circuitBreaker.failures >= circuitBreaker.threshold) {
          circuitBreaker.tripped = true
          circuitBreaker.tripTime = Date.now()
          logger.warn('Circuit breaker tripped after repeated fetch failures', {
            endpoint,
            failures: circuitBreaker.failures,
            origin:
              typeof window !== 'undefined' ? window.location.origin : 'unknown',
          })
        }
      }

      normalizedError = createApiClientError({
        kind: 'network',
        message: `[NETWORK_ERROR] Request ${endpoint} failed because the network is unavailable.`,
        endpoint,
        details: {
          currentHost,
          apiHost,
          origin:
            typeof window !== 'undefined' ? window.location.origin : 'unknown',
        },
        cause: normalizedError,
      })
    }

    if (!isApiClientError(normalizedError) && normalizedError instanceof Error) {
      normalizedError = createApiClientError({
        kind: 'unknown',
        message: normalizedError.message,
        endpoint,
        cause: normalizedError,
      })
    }

    const errorEnd = performance.now()
    const status =
      normalizedError &&
      typeof normalizedError === 'object' &&
      'status' in normalizedError
        ? Number((normalizedError as { status?: unknown }).status)
        : undefined

    if (!shouldSuppressErrorLog(status, options)) {
      const apiClientError = isApiClientError(normalizedError) ? normalizedError : undefined
      logger.error(`Request failed for ${endpoint}`, {
        durationMs: Number((errorEnd - start).toFixed(2)),
        method: requestMethod,
        error: normalizedError,
        errorKind: apiClientError?.kind,
        code: apiClientError?.code,
        details: apiClientError?.details,
        status,
      })
    }

    if (
      normalizedError instanceof Error &&
      ((normalizedError as ApiFetchError).status === 401 ||
        /invalid or expired token/i.test(normalizedError.message))
    ) {
      handleUnauthorizedSession(endpoint)
    }

    throw normalizedError
  }
}
