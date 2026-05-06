import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  registerAdapterMock,
  startMock,
  refreshMock,
} = vi.hoisted(() => ({
  registerAdapterMock: vi.fn(),
  startMock: vi.fn().mockResolvedValue(undefined),
  refreshMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/offline-sync/engine/offline-sync-engine', () => ({
  offlineSyncEngine: {
    registerAdapter: registerAdapterMock,
    start: startMock,
    refresh: refreshMock,
  },
}))

vi.mock('@/offline-sync/adapters/stocktake-offline-sync-adapter', () => ({
  stocktakeOfflineSyncAdapter: {
    id: 'warehouse.stocktake',
    label: '盘点离线同步',
    intents: ['PDA_SUBMIT_SCAN', 'PDA_STOCKTAKE_PATCH'],
    flush: vi.fn(),
  },
}))

describe('OfflineSyncBootstrapService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('window', {})
  })

  it('registers built-in adapters and starts the engine through the single formal path', async () => {
    const { OfflineSyncBootstrapService } = await import('./offline-sync-bootstrap-service')

    await OfflineSyncBootstrapService.ensureStarted()

    expect(registerAdapterMock).toHaveBeenCalledTimes(1)
    expect(startMock).toHaveBeenCalledTimes(1)
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight start promise across concurrent callers', async () => {
    const { OfflineSyncBootstrapService } = await import('./offline-sync-bootstrap-service')

    let resolveStart: (() => void) | undefined
    startMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveStart = resolve
        })
    )

    const first = OfflineSyncBootstrapService.ensureStarted()
    const second = OfflineSyncBootstrapService.ensureStarted()

    await vi.waitFor(() => {
      expect(startMock).toHaveBeenCalledTimes(1)
    })
    resolveStart?.()
    await Promise.all([first, second])
    expect(startMock).toHaveBeenCalledTimes(1)
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })
})
