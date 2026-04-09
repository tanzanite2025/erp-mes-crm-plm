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

export function isUnauthorizedError(error: unknown): boolean {
  return getErrorStatus(error) === 401
}

export function isForbiddenError(error: unknown): boolean {
  return getErrorStatus(error) === 403
}

export function isNotFoundError(error: unknown): boolean {
  return getErrorStatus(error) === 404
}
