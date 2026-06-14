import Dexie, { type EntityTable } from 'dexie'
import type {
  OfflineConflictRecord,
  OfflineEntitySnapshot,
  OfflineSyncMeta,
  PendingDeltaRecord,
} from '../types/offline-sync'

export type OfflineSnapshotRow = OfflineEntitySnapshot<unknown> & {
  key: string
}

export type OfflinePendingDeltaRow = PendingDeltaRecord<unknown> & {
  key: string
}

export type OfflineSyncMetaRow = OfflineSyncMeta & {
  key: string
}

export type OfflineConflictRow = OfflineConflictRecord<unknown> & {
  key: string
}

const PENDING_DELTA_STORE_V2 =
  'key, opId, [entityType+entityId], entityType, entityId, state, intent, createdAt, updatedAt, batchId'

const PENDING_DELTA_STORE_V3 =
  'key, opId, [entityType+entityId], [intent+state], entityType, entityId, state, intent, createdAt, updatedAt, batchId'

class XdfcOfflineSyncDexieDb extends Dexie {
  snapshots!: EntityTable<OfflineSnapshotRow, 'key'>
  pendingDeltas!: EntityTable<OfflinePendingDeltaRow, 'key'>
  syncMeta!: EntityTable<OfflineSyncMetaRow, 'key'>
  conflictRecords!: EntityTable<OfflineConflictRow, 'key'>

  constructor() {
    super('xdfc-offline-sync-db')

    this.version(2).stores({
      snapshots: 'key, entityType, entityId, syncedAt',
      pendingDeltas: PENDING_DELTA_STORE_V2,
      syncMeta: 'key, entityType, entityId, queueState, lastSyncAt',
      conflictRecords:
        'key, conflictId, opId, [entityType+entityId], entityType, entityId, createdAt, resolvedAt, reason',
    })

    this.version(3).stores({
      snapshots: 'key, entityType, entityId, syncedAt',
      pendingDeltas: PENDING_DELTA_STORE_V3,
      syncMeta: 'key, entityType, entityId, queueState, lastSyncAt',
      conflictRecords:
        'key, conflictId, opId, [entityType+entityId], entityType, entityId, createdAt, resolvedAt, reason',
    })
  }
}

export const offlineSyncDb = new XdfcOfflineSyncDexieDb()

export function buildOfflineEntityKey(entityType: string, entityId: string) {
  return `${entityType}::${entityId}`
}
