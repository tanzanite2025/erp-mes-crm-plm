'use client'

import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { OfflineStorage } from '@/offline-sync/storage/offline-storage'
import type { PendingDeltaRecord } from '@/offline-sync/types/offline-sync'

const logger = createLogger('PersistenceService')
const PERSISTENCE_ENTITY_TYPE = 'system.persistence'

function createOperationId(key: string) {
  return `${PERSISTENCE_ENTITY_TYPE}:${key}:${crypto.randomUUID()}`
}

function buildPendingDelta(
  key: string,
  operation: 'save' | 'delete',
  previousValue: unknown,
  nextValue: unknown,
  baseVersion: number,
  timestamp: string
): PendingDeltaRecord<unknown> {
  return {
    opId: createOperationId(key),
    clientId: 'system-persistence',
    entityType: PERSISTENCE_ENTITY_TYPE,
    entityId: key,
    path: key,
    o: previousValue,
    n: nextValue,
    baseVersion,
    intent: `system.persistence.${operation}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    state: 'queued',
  }
}

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
  _isCloudSyncStarted: false,

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
    if (PersistenceService._isCloudSyncStarted) return

    PersistenceService._isCloudSyncStarted = true
    try {
      logger.info('Starting parallel cloud sync')

      logger.info('High-priority initialization detached and running in background')
    } catch (error) {
      logger.error('Cloud sync failure', error)
      PersistenceService._isCloudSyncStarted = false
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
        const existingMeta = await OfflineStorage.getSyncMeta(PERSISTENCE_ENTITY_TYPE, key)
        const baseVersion = Math.max(existingSnapshot?.version ?? 0, existingMeta?.latestAckVersion ?? 0)
        const nextVersion = baseVersion + 1

        await OfflineStorage.saveSnapshot({
          entityType: PERSISTENCE_ENTITY_TYPE,
          entityId: key,
          version: nextVersion,
          data,
          syncedAt: timestamp,
        })
        await OfflineStorage.enqueueDelta(
          buildPendingDelta(key, 'save', existingSnapshot?.data ?? null, data, baseVersion, timestamp)
        )
        await OfflineStorage.upsertSyncMeta({
          entityType: PERSISTENCE_ENTITY_TYPE,
          entityId: key,
          latestAckVersion: existingMeta?.latestAckVersion ?? existingSnapshot?.version ?? 0,
          lastSyncAt: existingMeta?.lastSyncAt ?? existingSnapshot?.syncedAt,
          hasConflict: existingMeta?.hasConflict ?? false,
          queueState: 'queued',
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
      const timestamp = new Date().toISOString()
      await OfflineStorage.transaction(async () => {
        const existingSnapshot = await readSnapshot(key)
        const existingMeta = await OfflineStorage.getSyncMeta(PERSISTENCE_ENTITY_TYPE, key)
        const baseVersion = Math.max(existingSnapshot?.version ?? 0, existingMeta?.latestAckVersion ?? 0)

        await OfflineStorage.enqueueDelta(
          buildPendingDelta(key, 'delete', existingSnapshot?.data ?? null, null, baseVersion, timestamp)
        )
        await OfflineStorage.removeSnapshot(PERSISTENCE_ENTITY_TYPE, key)
        await OfflineStorage.upsertSyncMeta({
          entityType: PERSISTENCE_ENTITY_TYPE,
          entityId: key,
          latestAckVersion: existingMeta?.latestAckVersion ?? existingSnapshot?.version ?? 0,
          lastSyncAt: existingMeta?.lastSyncAt ?? existingSnapshot?.syncedAt,
          hasConflict: existingMeta?.hasConflict ?? false,
          queueState: 'queued',
        })
      })
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
