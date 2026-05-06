import { stocktakeOfflineSyncAdapter } from '@/offline-sync/adapters/stocktake-offline-sync-adapter'
import { offlineSyncEngine } from '@/offline-sync/engine/offline-sync-engine'

let isRegistered = false
let isStarted = false
let startPromise: Promise<void> | null = null

function registerBuiltInAdapters() {
  if (isRegistered) {
    return
  }

  offlineSyncEngine.registerAdapter(stocktakeOfflineSyncAdapter)
  isRegistered = true
}

/**
 * Bootstrap entry for shared offline sync startup.
 */
export const OfflineSyncBootstrapService = {
  /**
   * Ensure the shared offline sync engine is registered and started exactly once.
   */
  async ensureStarted() {
    if (typeof window === 'undefined') {
      return
    }

    registerBuiltInAdapters()

    if (isStarted) {
      await offlineSyncEngine.refresh()
      return
    }

    if (startPromise) {
      await startPromise
      return
    }

    startPromise = (async () => {
      await offlineSyncEngine.start()
      await offlineSyncEngine.refresh()
      isStarted = true
    })()

    try {
      await startPromise
    } catch (error) {
      isStarted = false
      throw error
    } finally {
      if (!isStarted) {
        startPromise = null
      }
    }
  },
}
