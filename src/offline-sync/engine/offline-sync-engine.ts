import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { OfflineStorage } from '@/offline-sync/storage/offline-storage'
import { useOfflineSyncStore, type OfflineSyncSummary } from '@/offline-sync/stores/offline-sync-store'

const logger = createLogger('OfflineSyncEngine')

type OfflineSyncCycleReason = 'start' | 'online' | 'manual' | 'adapter_registered'

export interface OfflineSyncAdapterFlushResult {
  syncedCount?: number
  failedCount?: number
  conflictCount?: number
  remainingCount?: number
}

export interface OfflineSyncAdapterCycleEvent {
  adapterId: string
  reason: OfflineSyncCycleReason
  syncedCount: number
  failedCount: number
  conflictCount: number
  remainingCount: number
  finishedAt: string
  errorMessage?: string
}

export interface OfflineSyncAdapter {
  id: string
  label: string
  intents: string[]
  flush: () => Promise<OfflineSyncAdapterFlushResult | void>
}

interface OfflineSyncPresentation {
  severity: 'healthy' | 'alert' | 'critical'
  headline: string
  detail: string
  announcementKey?: string
  announcementMode?: 'info' | 'error'
}

const adapters = new Map<string, OfflineSyncAdapter>()
const adapterCycleSettledListeners = new Map<string, Set<(event: OfflineSyncAdapterCycleEvent) => void>>()
let isStarted = false
let isStarting = false
let isFlushRunning = false
let shouldReplayFlush = false
let lastAnnouncementKey: string | undefined
let lastFlushAt: string | undefined
let lastErrorMessage: string | undefined

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function buildSummaryMessage(summary: OfflineSyncSummary, isOnline: boolean, isSyncing: boolean): OfflineSyncPresentation {
  if (summary.unhandledPendingCount > 0) {
    return {
      severity: 'critical',
      headline: '发现未接管的离线变更',
      detail: `当前有 ${summary.unhandledPendingCount} 条离线变更未绑定同步适配器，系统无法安全重放。`,
      announcementKey: `unhandled:${summary.unhandledIntents.join('|')}`,
      announcementMode: 'error',
    }
  }

  if (summary.conflictCount > 0) {
    return {
      severity: 'critical',
      headline: '存在待处理的离线冲突',
      detail: `当前有 ${summary.conflictCount} 条冲突尚未解决，请先处理后再继续依赖离线结果。`,
      announcementKey: `conflict:${summary.conflictCount}`,
      announcementMode: 'error',
    }
  }

  if (!isOnline && summary.pendingCount > 0) {
    return {
      severity: 'alert',
      headline: '当前离线，存在待恢复同步数据',
      detail: `已缓存 ${summary.pendingCount} 条离线变更，网络恢复后将自动继续重放。`,
      announcementKey: `offline:${summary.pendingCount}`,
      announcementMode: 'info',
    }
  }

  if (lastErrorMessage && summary.pendingCount > 0) {
    return {
      severity: 'alert',
      headline: '离线同步暂时失败，等待自动重试',
      detail: `当前仍有 ${summary.pendingCount} 条变更待同步。最近错误：${lastErrorMessage}`,
      announcementKey: `flush-error:${lastErrorMessage}`,
      announcementMode: 'error',
    }
  }

  if (isSyncing) {
    return {
      severity: 'alert',
      headline: '正在重放离线变更',
      detail: `已接管 ${summary.activeAdapterCount} 个同步适配器，正在执行自动恢复。`,
    }
  }

  if (summary.pendingCount > 0) {
    return {
      severity: 'alert',
      headline: '仍有离线变更待同步',
      detail: `当前剩余 ${summary.pendingCount} 条待同步变更，系统会继续自动恢复。`,
    }
  }

  return {
    severity: 'healthy',
    headline: '',
    detail: '',
  }
}

async function buildSummary(): Promise<OfflineSyncSummary> {
  const summarySnapshot = await OfflineStorage.getSummarySnapshot()
  const handledIntents = new Set(Array.from(adapters.values()).flatMap((adapter) => adapter.intents))
  const unhandledIntents = Object.entries(summarySnapshot.pendingByIntent)
    .filter(([intent, count]) => count > 0 && !handledIntents.has(intent))
    .map(([intent]) => intent)
    .sort()

  const unhandledPendingCount = unhandledIntents.reduce(
    (total, intent) => total + (summarySnapshot.pendingByIntent[intent] ?? 0),
    0
  )

  return {
    pendingCount: summarySnapshot.pendingCount,
    conflictCount: summarySnapshot.conflictCount,
    unhandledPendingCount,
    activeAdapterCount: adapters.size,
    unhandledIntents,
  }
}

function emitAnnouncement(presentation: OfflineSyncPresentation) {
  if (!presentation.announcementKey) {
    lastAnnouncementKey = undefined
    return
  }

  if (presentation.announcementKey === lastAnnouncementKey) {
    return
  }

  lastAnnouncementKey = presentation.announcementKey

  if (presentation.announcementMode === 'error') {
    failLoudly(new Error(`${presentation.headline} ${presentation.detail}`.trim()), 'OfflineSyncEngine')
    return
  }

  toast.info(presentation.headline, {
    description: presentation.detail,
    duration: 6000,
  })
}

async function publishState(isSyncing: boolean) {
  const summary = await buildSummary()
  const presentation = buildSummaryMessage(summary, isBrowserOnline(), isSyncing)

  useOfflineSyncStore.getState().setBannerState({
    isEngineStarted: isStarted,
    isOnline: isBrowserOnline(),
    isSyncing,
    severity: presentation.severity,
    headline: presentation.headline,
    detail: presentation.detail,
    summary,
    lastFlushAt,
    lastErrorMessage,
    updatedAt: new Date().toISOString(),
  })

  emitAnnouncement(presentation)
  return summary
}

function buildCycleEvent(
  adapterId: string,
  reason: OfflineSyncCycleReason,
  result?: OfflineSyncAdapterFlushResult,
  error?: unknown
): OfflineSyncAdapterCycleEvent {
  return {
    adapterId,
    reason,
    syncedCount: result?.syncedCount ?? 0,
    failedCount: result?.failedCount ?? 0,
    conflictCount: result?.conflictCount ?? 0,
    remainingCount: result?.remainingCount ?? 0,
    finishedAt: new Date().toISOString(),
    errorMessage: error instanceof Error ? error.message : typeof error === 'string' ? error : undefined,
  }
}

function notifyAdapterCycleSettled(event: OfflineSyncAdapterCycleEvent) {
  const listeners = adapterCycleSettledListeners.get(event.adapterId)
  if (!listeners) {
    return
  }

  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (error) {
      logger.warn(`Offline sync adapter listener failed: ${event.adapterId}`, error)
    }
  })
}

async function flushAllAdapters(reason: OfflineSyncCycleReason) {
  if (!isBrowserOnline()) {
    await publishState(false)
    return
  }

  if (isFlushRunning) {
    shouldReplayFlush = true
    return
  }

  isFlushRunning = true
  await publishState(true)

  try {
    let cycleHadError = false

    for (const adapter of adapters.values()) {
      try {
        const result = await adapter.flush()
        const normalizedResult = result === undefined ? undefined : result
        const event = buildCycleEvent(adapter.id, reason, normalizedResult)
        notifyAdapterCycleSettled(event)
      } catch (error) {
        cycleHadError = true
        lastErrorMessage = error instanceof Error ? error.message : 'Unknown offline sync error'
        logger.error(`Adapter flush failed: ${adapter.id}`, { reason, error })
        const event = buildCycleEvent(adapter.id, reason, undefined, error)
        notifyAdapterCycleSettled(event)
      }
    }

    if (!cycleHadError) {
      lastErrorMessage = undefined
    }

    lastFlushAt = new Date().toISOString()
    await publishState(false)
  } finally {
    isFlushRunning = false

    if (shouldReplayFlush) {
      shouldReplayFlush = false
      void flushAllAdapters('manual')
    }
  }
}

function handleOnline() {
  lastErrorMessage = undefined
  void publishState(false)
  void flushAllAdapters('online')
}

function handleOffline() {
  void publishState(false)
}

/**
 * Public offline sync engine APIs.
 */
export const offlineSyncEngine = {
  /**
   * Register a replay-capable offline sync adapter and optionally trigger catch-up.
   * @param adapter The adapter to register.
   * @returns A function to unregister the adapter.
   */
  registerAdapter(adapter: OfflineSyncAdapter) {
    adapters.set(adapter.id, adapter)

    if (isStarted) {
      void publishState(isFlushRunning)
      if (isBrowserOnline()) {
        void flushAllAdapters('adapter_registered')
      }
    }

    return () => {
      adapters.delete(adapter.id)
      void publishState(isFlushRunning)
    }
  },

  /**
   * Subscribe to the end of each adapter-scoped flush cycle.
   * @param adapterId The adapter identifier to observe.
   * @param listener The listener function.
   * @returns A function to unsubscribe.
   */
  subscribeAdapterCycleSettled(adapterId: string, listener: (event: OfflineSyncAdapterCycleEvent) => void) {
    const listeners = adapterCycleSettledListeners.get(adapterId) ?? new Set<(event: OfflineSyncAdapterCycleEvent) => void>()
    listeners.add(listener)
    adapterCycleSettledListeners.set(adapterId, listeners)

    return () => {
      const current = adapterCycleSettledListeners.get(adapterId)
      if (!current) {
        return
      }

      current.delete(listener)
      if (current.size === 0) {
        adapterCycleSettledListeners.delete(adapterId)
      }
    }
  },

  /**
   * Start the global offline sync engine and attach network listeners once.
   */
  async start() {
    if (typeof window === 'undefined') {
      return
    }

    if (isStarted || isStarting) {
      return
    }

    isStarting = true
    try {
      await OfflineStorage.ensureReady()
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      isStarted = true
      await publishState(false)
      if (isBrowserOnline()) {
        await flushAllAdapters('start')
      }
    } catch (error) {
      logger.error('Offline sync engine start failed', error)
      throw error
    } finally {
      isStarting = false
    }
  },

  /**
   * Recompute the current offline sync summary and UI banner state.
   */
  async refresh() {
    await publishState(isFlushRunning)
  },

  /**
   * Force an immediate replay attempt across all registered adapters.
   */
  async flushNow() {
    await flushAllAdapters('manual')
  },
}
