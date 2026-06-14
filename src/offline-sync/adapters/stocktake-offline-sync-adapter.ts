import type { OfflineSyncAdapter } from '@/offline-sync/engine/offline-sync-engine'
import { StocktakeOfflineAdapter } from '@/features/warehouse/stocktake'

/**
 * Global offline sync adapter that bridges stocktake replay into the shared engine.
 */
export const stocktakeOfflineSyncAdapter: OfflineSyncAdapter = {
  id: 'warehouse.stocktake',
  label: '盘点离线同步',
  intents: ['PDA_SUBMIT_SCAN', 'PDA_STOCKTAKE_PATCH'],
  async flush() {
    const [scanResult, patchResult] = await Promise.all([
      StocktakeOfflineAdapter.flushQueuedScans(),
      StocktakeOfflineAdapter.flushQueuedPatches(),
    ])

    return {
      syncedCount: scanResult.syncedCount + patchResult.syncedCount,
      failedCount: scanResult.failedCount + patchResult.failedCount,
      conflictCount: patchResult.conflictCount,
      remainingCount: scanResult.remainingCount + patchResult.remainingCount,
    }
  },
}
