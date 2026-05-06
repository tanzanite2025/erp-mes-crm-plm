'use client'

import { OfflineSyncBootstrapService } from '@/offline-sync/services/offline-sync-bootstrap-service'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { OfflineStorage } from '@/offline-sync/storage/offline-storage'

const logger = createLogger('PersistenceService')
const PERSISTENCE_ENTITY_TYPE = 'system.persistence'

async function readSnapshot(key: string) {
  return OfflineStorage.getSnapshot(PERSISTENCE_ENTITY_TYPE, key)
}

function createPersistenceCorruptionError(operation: string, key?: string, cause?: unknown) {
  const keyLabel = key ? ` for key "${key}"` : ''
  const detail =
    cause instanceof Error
      ? cause.message
      : typeof cause === 'string'
        ? cause
        : 'unknown persistence failure'

  return new Error(`[CRITICAL] PERSISTENCE_CORRUPTION: ${operation}${keyLabel} failed. ${detail}`)
}

export const PersistenceService = {
  _isLocalInitialized: false,

  initLocalStore: async () => {
    if (typeof window === 'undefined') return
    if (PersistenceService._isLocalInitialized) return

    try {
      await OfflineStorage.ensureReady()
      PersistenceService._isLocalInitialized = true
      logger.info('Phase 1 (Core Boot) complete')
    } catch (error) {
      const persistenceError = createPersistenceCorruptionError('Dexie bootstrap', undefined, error)
      failLoudly(persistenceError, 'PersistenceService.initLocalStore')
      throw persistenceError
    }
  },

  initCloudSync: async () => {
    if (typeof window === 'undefined') return

    try {
      logger.info('Delegating cloud sync bootstrap to OfflineSyncBootstrapService')
      await OfflineSyncBootstrapService.ensureStarted()
    } catch (error) {
      logger.error('Cloud sync failure', error)
      throw error
    }
  },

  forceResetFromBackup: async () => {
    logger.warn('Manual reset restricted in Cloud-only mode')
  },

  saveLocal: async (key: string, data: unknown) => {
    try {
      const timestamp = new Date().toISOString()
      await OfflineStorage.transaction(async () => {
        const existingSnapshot = await readSnapshot(key)
        const nextVersion = (existingSnapshot?.version ?? 0) + 1

        await OfflineStorage.saveSnapshot({
          entityType: PERSISTENCE_ENTITY_TYPE,
          entityId: key,
          version: nextVersion,
          data,
          syncedAt: timestamp,
        })
      })
    } catch (error) {
      const persistenceError = createPersistenceCorruptionError('save', key, error)
      failLoudly(persistenceError, 'PersistenceService.saveLocal')
      throw persistenceError
    }
  },

  getLocal: async (key: string): Promise<unknown> => {
    try {
      const snapshot = await readSnapshot(key)
      return snapshot?.data ?? null
    } catch (error) {
      const persistenceError = createPersistenceCorruptionError('load', key, error)
      failLoudly(persistenceError, 'PersistenceService.getLocal')
      throw persistenceError
    }
  },

  deleteLocal: async (key: string) => {
    try {
      await OfflineStorage.removeSnapshot(PERSISTENCE_ENTITY_TYPE, key)
    } catch (error) {
      const persistenceError = createPersistenceCorruptionError('delete', key, error)
      failLoudly(persistenceError, 'PersistenceService.deleteLocal')
      throw persistenceError
    }
  },

  getFullDataSnapshot: async () => {
    try {
      const snapshots = await OfflineStorage.listSnapshotsByEntityType(PERSISTENCE_ENTITY_TYPE)
      const data = snapshots.reduce<Record<string, unknown>>((acc, snapshot) => {
        acc[snapshot.entityId] = snapshot.data
        return acc
      }, {})
      return JSON.stringify(data, null, 2)
    } catch (error) {
      const persistenceError = createPersistenceCorruptionError('snapshot export', undefined, error)
      failLoudly(persistenceError, 'PersistenceService.getFullDataSnapshot')
      throw persistenceError
    }
  },
}
