import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  failLoudlyMock,
  toastInfoMock,
  ensureReadyMock,
  getSummarySnapshotMock,
  listPendingDeltasMock,
  listOpenConflictsMock,
} = vi.hoisted(() => ({
  failLoudlyMock: vi.fn(),
  toastInfoMock: vi.fn(),
  ensureReadyMock: vi.fn().mockResolvedValue(undefined),
  getSummarySnapshotMock: vi.fn(),
  listPendingDeltasMock: vi.fn(),
  listOpenConflictsMock: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  }),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('sonner', () => ({
  toast: {
    info: toastInfoMock,
  },
}))

vi.mock('@/offline-sync/storage/offline-storage', () => ({
  OfflineStorage: {
    ensureReady: ensureReadyMock,
    getSummarySnapshot: getSummarySnapshotMock,
    listPendingDeltas: listPendingDeltasMock,
    listOpenConflicts: listOpenConflictsMock,
  },
}))

describe('offlineSyncEngine adapter-scoped events', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    getSummarySnapshotMock.mockResolvedValue({
      pendingCount: 0,
      conflictCount: 0,
      pendingByIntent: {},
    })
    listPendingDeltasMock.mockResolvedValue([])
    listOpenConflictsMock.mockResolvedValue([])
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('navigator', {
      onLine: true,
    })
  })

  it('notifies only the subscribed adapter listener for its scoped cycle event', async () => {
    const { offlineSyncEngine } = await import('./offline-sync-engine')

    const adapterAFlush = vi.fn().mockResolvedValue({
      syncedCount: 2,
      failedCount: 0,
      conflictCount: 0,
      remainingCount: 0,
    })
    const adapterBFlush = vi.fn().mockResolvedValue({
      syncedCount: 1,
      failedCount: 0,
      conflictCount: 0,
      remainingCount: 0,
    })

    const unsubscribeA = offlineSyncEngine.registerAdapter({
      id: 'adapter.a',
      label: 'A',
      intents: ['INTENT_A'],
      flush: adapterAFlush,
    })
    const unsubscribeB = offlineSyncEngine.registerAdapter({
      id: 'adapter.b',
      label: 'B',
      intents: ['INTENT_B'],
      flush: adapterBFlush,
    })

    const scopedListener = vi.fn()
    const unsubscribeScoped = offlineSyncEngine.subscribeAdapterCycleSettled('adapter.a', scopedListener)

    await offlineSyncEngine.start()
    await offlineSyncEngine.flushNow()

    expect(scopedListener).toHaveBeenCalled()
    expect(scopedListener.mock.calls.every(([event]) => event.adapterId === 'adapter.a')).toBe(true)
    expect(getSummarySnapshotMock).toHaveBeenCalled()
    expect(listPendingDeltasMock).not.toHaveBeenCalled()
    expect(listOpenConflictsMock).not.toHaveBeenCalled()

    unsubscribeScoped()
    unsubscribeA()
    unsubscribeB()
  })
})
