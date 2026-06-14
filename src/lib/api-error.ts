export type ApiErrorKind =
  | 'auth_required'
  | 'circuit_breaker'
  | 'timeout'
  | 'network'
  | 'http'
  | 'invalid_response'
  | 'unknown'

export interface ApiClientError extends Error {
  kind: ApiErrorKind
  endpoint?: string
  status?: number
  code?: unknown
  isConflict?: boolean
  context?: string
  details?: Record<string, unknown>
  cause?: unknown
}

export interface CreateApiClientErrorOptions {
  kind: ApiErrorKind
  message: string
  endpoint?: string
  status?: number
  code?: unknown
  isConflict?: boolean
  context?: string
  details?: Record<string, unknown>
  cause?: unknown
}

export function createApiClientError(
  options: CreateApiClientErrorOptions
): ApiClientError {
  const error = new Error(options.message) as ApiClientError
  error.name = 'ApiClientError'
  error.kind = options.kind
  error.endpoint = options.endpoint
  error.status = options.status
  error.code = options.code
  error.isConflict = options.isConflict
  error.context = options.context
  error.details = options.details
  error.cause = options.cause
  return error
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'kind' in error &&
    typeof (error as { kind?: unknown }).kind === 'string' &&
    'message' in error
  )
}

export function getApiErrorKind(error: unknown): ApiErrorKind | undefined {
  if (isApiClientError(error)) {
    return error.kind
  }

  if (!(error instanceof Error)) {
    return undefined
  }

  if (error.message.includes('[AUTH_REQUIRED]')) return 'auth_required'
  if (error.message.includes('[CIRCUIT_BREAKER]')) return 'circuit_breaker'
  if (error.message.includes('[TIMEOUT]')) return 'timeout'
  if (error.message.includes('[NETWORK_ERROR]')) return 'network'
  if (error.message.includes('[INVALID_RESPONSE]')) return 'invalid_response'

  return undefined
}
