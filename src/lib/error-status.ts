import { getApiErrorKind, type ApiErrorKind } from '@/lib/api-error'

export function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status)
    return Number.isFinite(status) ? status : undefined
  }

  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: unknown } }).response
    const status = Number(response?.status)
    return Number.isFinite(status) ? status : undefined
  }

  return undefined
}

export function getErrorKind(error: unknown): ApiErrorKind | undefined {
  return getApiErrorKind(error)
}

export function isUnauthorizedError(error: unknown): boolean {
  return getErrorStatus(error) === 401
}

export function isForbiddenError(error: unknown): boolean {
  return getErrorStatus(error) === 403
}

export function isNotFoundError(error: unknown): boolean {
  return getErrorStatus(error) === 404
}

export function isAuthRequiredError(error: unknown): boolean {
  return getErrorKind(error) === 'auth_required'
}

export function isCircuitBreakerError(error: unknown): boolean {
  return getErrorKind(error) === 'circuit_breaker'
}

export function isTimeoutError(error: unknown): boolean {
  return getErrorKind(error) === 'timeout'
}

export function isNetworkError(error: unknown): boolean {
  return getErrorKind(error) === 'network'
}

export function isInvalidResponseError(error: unknown): boolean {
  return getErrorKind(error) === 'invalid_response'
}
