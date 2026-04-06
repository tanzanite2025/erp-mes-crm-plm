import { AxiosError } from 'axios'

export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof AxiosError) {
    return error.response?.status
  }

  if (error && typeof error === 'object' && 'status' in error) {
    const status = Number(error.status)
    return Number.isFinite(status) ? status : undefined
  }

  return undefined
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
