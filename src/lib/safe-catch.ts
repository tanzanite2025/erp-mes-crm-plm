import { getServerErrorPresentation, showServerErrorToast } from './handle-server-error'
import { createLogger } from './logger'

const logger = createLogger('SafeCatch')

export function failLoudly(
  error: unknown,
  scope: string,
  options: { silentUI?: boolean } = {}
): void {
  const { silentUI = false } = options

  logger.error(`[FAIL_LOUDLY] ${scope}`, error)

  if (!silentUI) {
    showServerErrorToast(getServerErrorPresentation(error))
  }
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
  scope: string,
  options: { silentUI?: boolean } = {}
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    failLoudly(error, scope, options)
    return undefined
  }
}
