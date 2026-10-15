import type { ProductionScanCommandApiRequestDTO } from '../contracts/production-scan-command-api-dto'

const pendingRequestStorageKey = 'xdfc.production.scan.pending-requests'
const pendingRequestKeys = new Map<string, string>()

function readPendingProductionScanRequestKeys(): Map<string, string> {
  try {
    const stored = globalThis.sessionStorage?.getItem(pendingRequestStorageKey)
    if (stored) {
      const entries: unknown = JSON.parse(stored)
      if (Array.isArray(entries)) {
        for (const entry of entries) {
          if (
            Array.isArray(entry) &&
            typeof entry[0] === 'string' &&
            typeof entry[1] === 'string'
          ) {
            pendingRequestKeys.set(entry[0], entry[1])
          }
        }
      }
    }
  } catch {
    // In-memory retry protection also works when session storage is unavailable.
  }
  return pendingRequestKeys
}

function persistPendingProductionScanRequestKeys() {
  try {
    globalThis.sessionStorage?.setItem(
      pendingRequestStorageKey,
      JSON.stringify([...pendingRequestKeys])
    )
  } catch {
    // The active session can still retry using the in-memory key.
  }
}

function productionScanCommandRequestContentKey(
  request: ProductionScanCommandApiRequestDTO
): string {
  const { idempotencyKey: _idempotencyKey, ...command } = request
  return JSON.stringify(command)
}

export function prepareProductionScanCommandRequestForRetry(
  request: ProductionScanCommandApiRequestDTO,
  hasExplicitIdempotencyKey: boolean
): ProductionScanCommandApiRequestDTO {
  if (hasExplicitIdempotencyKey) return request
  const contentKey = productionScanCommandRequestContentKey(request)
  const keys = readPendingProductionScanRequestKeys()
  const key = keys.get(contentKey) ?? request.idempotencyKey
  keys.set(contentKey, key)
  persistPendingProductionScanRequestKeys()
  return { ...request, idempotencyKey: key }
}

export function releaseCompletedProductionScanCommandRetryKey(
  request: ProductionScanCommandApiRequestDTO
) {
  const contentKey = productionScanCommandRequestContentKey(request)
  if (
    readPendingProductionScanRequestKeys().get(contentKey) ===
    request.idempotencyKey
  ) {
    pendingRequestKeys.delete(contentKey)
    persistPendingProductionScanRequestKeys()
  }
}
