import {
  buildOfflineEntityKey,
  offlineSyncDb,
  type OfflineConflictRow,
  type OfflinePendingDeltaRow,
  type OfflineSnapshotRow,
  type OfflineSyncMetaRow,
} from './dexie-offline-db'
import type { OfflineConflictRecord, OfflineEntitySnapshot, OfflineSyncMeta, PendingDeltaRecord } from '../types/offline-sync'

function toSnapshotRow(snapshot: OfflineEntitySnapshot<unknown>): OfflineSnapshotRow {
  return {
    ...snapshot,
    key: buildOfflineEntityKey(snapshot.entityType, snapshot.entityId),
  }
}

function toSyncMetaRow(meta: OfflineSyncMeta): OfflineSyncMetaRow {
  return {
    ...meta,
    key: buildOfflineEntityKey(meta.entityType, meta.entityId),
  }
}

function toPendingDeltaRow(delta: PendingDeltaRecord<unknown>): OfflinePendingDeltaRow {
  return {
    ...delta,
    key: delta.opId,
  }
}

function toConflictRow(conflict: OfflineConflictRecord<unknown>): OfflineConflictRow {
  return {
    ...conflict,
    key: conflict.conflictId,
  }
}

export const OfflineStorage = {
  async saveSnapshot(snapshot: OfflineEntitySnapshot<unknown>) {
    await offlineSyncDb.snapshots.put(toSnapshotRow(snapshot))
  },

  async getSnapshot(entityType: string, entityId: string) {
    return offlineSyncDb.snapshots.get(buildOfflineEntityKey(entityType, entityId))
  },

  async upsertSyncMeta(meta: OfflineSyncMeta) {
    await offlineSyncDb.syncMeta.put(toSyncMetaRow(meta))
  },

  async getSyncMeta(entityType: string, entityId: string) {
    return offlineSyncDb.syncMeta.get(buildOfflineEntityKey(entityType, entityId))
  },

  async enqueueDelta(delta: PendingDeltaRecord<unknown>) {
    await offlineSyncDb.pendingDeltas.put(toPendingDeltaRow(delta))
  },

  async updatePendingDelta(opId: string, patch: Partial<PendingDeltaRecord<unknown>>) {
    await offlineSyncDb.pendingDeltas.update(opId, patch)
  },

  async removePendingDelta(opId: string) {
    await offlineSyncDb.pendingDeltas.delete(opId)
  },

  async getPendingByEntity(entityType: string, entityId: string) {
    return offlineSyncDb.pendingDeltas
      .where('[entityType+entityId]')
      .equals([entityType, entityId])
      .sortBy('createdAt')
  },

  async getQueuedByIntent(intent: string) {
    return offlineSyncDb.pendingDeltas.where({ intent, state: 'queued' }).toArray()
  },

  async getAllByIntent(intent: string) {
    return offlineSyncDb.pendingDeltas.where({ intent }).sortBy('createdAt')
  },

  async removePendingDeltas(opIds: string[]) {
    await offlineSyncDb.pendingDeltas.bulkDelete(opIds)
  },

  async saveConflict(conflict: OfflineConflictRecord<unknown>) {
    await offlineSyncDb.conflictRecords.put(toConflictRow(conflict))
  },

  async listConflictsByEntity(entityType: string, entityId: string) {
    return offlineSyncDb.conflictRecords
      .where('[entityType+entityId]')
      .equals([entityType, entityId])
      .sortBy('createdAt')
  },

  async listConflictsByEntityType(entityType: string) {
    return offlineSyncDb.conflictRecords.where({ entityType }).sortBy('createdAt')
  },

  async getConflict(conflictId: string) {
    return offlineSyncDb.conflictRecords.get(conflictId)
  },

  async markConflictResolved(conflictId: string, resolvedAt: string, resolvedStrategy: 'discard' | 'retry') {
    await offlineSyncDb.conflictRecords.update(conflictId, {
      resolvedAt,
      resolvedStrategy,
    })
  },

  async removeConflict(conflictId: string) {
    await offlineSyncDb.conflictRecords.delete(conflictId)
  },

  async transaction<T>(executor: () => Promise<T>) {
    return offlineSyncDb.transaction(
      'rw',
      offlineSyncDb.snapshots,
      offlineSyncDb.pendingDeltas,
      offlineSyncDb.syncMeta,
      offlineSyncDb.conflictRecords,
      executor
    )
  },
}
