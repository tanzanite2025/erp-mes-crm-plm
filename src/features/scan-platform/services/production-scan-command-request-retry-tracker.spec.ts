import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProductionScanCommandApiRequestDTO } from '../contracts/production-scan-command-api-dto'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('production scan command retry key persistence', () => {
  it('restores an unresolved request key after the service module reloads', async () => {
    const storageEntries = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storageEntries.get(key) ?? null,
      setItem: (key: string, value: string) => storageEntries.set(key, value),
    })
    const request: ProductionScanCommandApiRequestDTO = {
      idempotencyKey: 'first-attempt',
      productBarcode: 'RELOAD-001',
      action: 'COMPLETE',
      commandSource: 'WEB',
    }
    const originalTracker =
      await import('./production-scan-command-request-retry-tracker')
    expect(
      originalTracker.prepareProductionScanCommandRequestForRetry(
        request,
        false
      )
    ).toEqual(request)

    vi.resetModules()
    const reloadedTracker =
      await import('./production-scan-command-request-retry-tracker')
    expect(
      reloadedTracker.prepareProductionScanCommandRequestForRetry(
        { ...request, idempotencyKey: 'new-page-generated-key' },
        false
      )
    ).toEqual(request)
    reloadedTracker.releaseCompletedProductionScanCommandRetryKey(request)

    vi.resetModules()
    const completedTracker =
      await import('./production-scan-command-request-retry-tracker')
    expect(
      completedTracker.prepareProductionScanCommandRequestForRetry(
        { ...request, idempotencyKey: 'next-command-key' },
        false
      ).idempotencyKey
    ).toBe('next-command-key')
  })

  it('keeps active-session retry protection when session storage is blocked', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('storage unavailable')
      },
      setItem: () => {
        throw new Error('storage unavailable')
      },
    })
    const tracker =
      await import('./production-scan-command-request-retry-tracker')
    const request: ProductionScanCommandApiRequestDTO = {
      idempotencyKey: 'in-memory-attempt',
      productBarcode: 'MEMORY-001',
      action: 'COMPLETE',
      commandSource: 'USB',
    }
    tracker.prepareProductionScanCommandRequestForRetry(request, false)
    expect(
      tracker.prepareProductionScanCommandRequestForRetry(
        { ...request, idempotencyKey: 'later-generated-key' },
        false
      )
    ).toEqual(request)
    tracker.releaseCompletedProductionScanCommandRetryKey(request)
  })
})
