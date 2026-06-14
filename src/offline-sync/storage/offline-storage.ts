import Dexie, { type Transaction } from 'dexie'
import type {
  OfflineConflictRecord,
  OfflineEntitySnapshot,
  OfflineSyncMeta,
  PendingDeltaRecord,
} from '../types/offline-sync'
import {
  buildOfflineEntityKey,
  offlineSyncDb,
  type OfflineConflictRow,
  type OfflinePendingDeltaRow,
  type OfflineSnapshotRow,
  type OfflineSyncMetaRow,
} from './dexie-offline-db'

function toSnapshotRow(
  snapshot: OfflineEntitySnapshot<unknown>
): OfflineSnapshotRow {
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

function toPendingDeltaRow(
  delta: PendingDeltaRecord<unknown>
): OfflinePendingDeltaRow {
  return {
    ...delta,
    key: delta.opId,
  }
}

function toConflictRow(
  conflict: OfflineConflictRecord<unknown>
): OfflineConflictRow {
  return {
    ...conflict,
    key: conflict.conflictId,
  }
}

interface OfflineStorageSummarySnapshot {
  pendingCount: number
  conflictCount: number
  pendingByIntent: Record<string, number>
}

interface OfflineStorageSummaryMutationAccumulator {
  pendingMutations: Array<{
    previous?: PendingDeltaRecord<unknown>
    next?: PendingDeltaRecord<unknown>
  }>
  conflictMutations: Array<{
    previous?: OfflineConflictRecord<unknown>
    next?: OfflineConflictRecord<unknown>
  }>
}

let summarySnapshotCache: OfflineStorageSummarySnapshot | null = null
const summaryMutationAccumulators = new WeakMap<
  Transaction,
  OfflineStorageSummaryMutationAccumulator
>()

function cloneSummarySnapshot(
  snapshot: OfflineStorageSummarySnapshot
): OfflineStorageSummarySnapshot {
  return {
    pendingCount: snapshot.pendingCount,
    conflictCount: snapshot.conflictCount,
    pendingByIntent: { ...snapshot.pendingByIntent },
  }
}

function isTrackedPendingState(
  state: PendingDeltaRecord<unknown>['state'] | undefined
) {
  return state === 'queued' || state === 'syncing' || state === 'conflict'
}

function incrementIntentCount(
  snapshot: OfflineStorageSummarySnapshot,
  intent: string
) {
  snapshot.pendingByIntent[intent] = (snapshot.pendingByIntent[intent] ?? 0) + 1
}

function decrementIntentCount(
  snapshot: OfflineStorageSummarySnapshot,
  intent: string
) {
  const next = (snapshot.pendingByIntent[intent] ?? 0) - 1
  if (next > 0) {
    snapshot.pendingByIntent[intent] = next
    return
  }

  delete snapshot.pendingByIntent[intent]
}

function applyPendingDeltaMutation(
  snapshot: OfflineStorageSummarySnapshot,
  previous?: PendingDeltaRecord<unknown>,
  next?: PendingDeltaRecord<unknown>
) {
  if (previous && isTrackedPendingState(previous.state)) {
    snapshot.pendingCount = Math.max(0, snapshot.pendingCount - 1)
    decrementIntentCount(snapshot, previous.intent)
  }

  if (next && isTrackedPendingState(next.state)) {
    snapshot.pendingCount += 1
    incrementIntentCount(snapshot, next.intent)
  }
}

function applyConflictMutation(
  snapshot: OfflineStorageSummarySnapshot,
  previous?: OfflineConflictRecord<unknown>,
  next?: OfflineConflictRecord<unknown>
) {
  if (previous && !previous.resolvedAt) {
    snapshot.conflictCount = Math.max(0, snapshot.conflictCount - 1)
  }

  if (next && !next.resolvedAt) {
    snapshot.conflictCount += 1
  }
}

async function hydrateSummarySnapshot(): Promise<OfflineStorageSummarySnapshot> {
  if (summarySnapshotCache) {
    return cloneSummarySnapshot(summarySnapshotCache)
  }

  const [pendingDeltas, openConflicts] = await Promise.all([
    offlineSyncDb.pendingDeltas.orderBy('createdAt').toArray(),
    offlineSyncDb.conflictRecords
      .filter((conflict) => !conflict.resolvedAt)
      .sortBy('createdAt'),
  ])

  const snapshot: OfflineStorageSummarySnapshot = {
    pendingCount: 0,
    conflictCount: openConflicts.length,
    pendingByIntent: {},
  }

  pendingDeltas.forEach((delta) => {
    if (!isTrackedPendingState(delta.state)) {
      return
    }

    snapshot.pendingCount += 1
    incrementIntentCount(snapshot, delta.intent)
  })

  summarySnapshotCache = snapshot
  return cloneSummarySnapshot(snapshot)
}

function getSummaryMutationAccumulator(transaction: Transaction) {
  const existing = summaryMutationAccumulators.get(transaction)
  if (existing) {
    return existing
  }

  const next: OfflineStorageSummaryMutationAccumulator = {
    pendingMutations: [],
    conflictMutations: [],
  }

  transaction.on('complete', () => {
    const accumulator = summaryMutationAccumulators.get(transaction)
    if (!accumulator) {
      return
    }

    if (summarySnapshotCache) {
      accumulator.pendingMutations.forEach((mutation) => {
        applyPendingDeltaMutation(
          summarySnapshotCache!,
          mutation.previous,
          mutation.next
        )
      })
      accumulator.conflictMutations.forEach((mutation) => {
        applyConflictMutation(
          summarySnapshotCache!,
          mutation.previous,
          mutation.next
        )
      })
    }

    summaryMutationAccumulators.delete(transaction)
  })

  transaction.on('abort', () => {
    summaryMutationAccumulators.delete(transaction)
  })

  summaryMutationAccumulators.set(transaction, next)
  return next
}

function queuePendingDeltaMutation(
  previous?: PendingDeltaRecord<unknown>,
  next?: PendingDeltaRecord<unknown>
) {
  if (!summarySnapshotCache) {
    return
  }

  const transaction = Dexie.currentTransaction
  if (!transaction) {
    applyPendingDeltaMutation(summarySnapshotCache, previous, next)
    return
  }

  getSummaryMutationAccumulator(transaction).pendingMutations.push({
    previous,
    next,
  })
}

function queueConflictMutation(
  previous?: OfflineConflictRecord<unknown>,
  next?: OfflineConflictRecord<unknown>
) {
  if (!summarySnapshotCache) {
    return
  }

  const transaction = Dexie.currentTransaction
  if (!transaction) {
    applyConflictMutation(summarySnapshotCache, previous, next)
    return
  }

  getSummaryMutationAccumulator(transaction).conflictMutations.push({
    previous,
    next,
  })
}

export const OfflineStorage = {
  async ensureReady() {
    await offlineSyncDb.open()
  },

  async saveSnapshot(snapshot: OfflineEntitySnapshot<unknown>) {
    await offlineSyncDb.snapshots.put(toSnapshotRow(snapshot))
  },

  async getSnapshot(entityType: string, entityId: string) {
    return offlineSyncDb.snapshots.get(
      buildOfflineEntityKey(entityType, entityId)
    )
  },

  async listSnapshotsByEntityType(entityType: string) {
    return offlineSyncDb.snapshots.where({ entityType }).toArray()
  },

  async removeSnapshot(entityType: string, entityId: string) {
    await offlineSyncDb.snapshots.delete(
      buildOfflineEntityKey(entityType, entityId)
    )
  },

  async upsertSyncMeta(meta: OfflineSyncMeta) {
    await offlineSyncDb.syncMeta.put(toSyncMetaRow(meta))
  },

  async getSyncMeta(entityType: string, entityId: string) {
    return offlineSyncDb.syncMeta.get(
      buildOfflineEntityKey(entityType, entityId)
    )
  },

  async enqueueDelta(delta: PendingDeltaRecord<unknown>) {
    await offlineSyncDb.pendingDeltas.put(toPendingDeltaRow(delta))

    queuePendingDeltaMutation(undefined, delta)
  },

  async updatePendingDelta(
    opId: string,
    patch: Partial<PendingDeltaRecord<unknown>>
  ) {
    const existing = summarySnapshotCache
      ? await offlineSyncDb.pendingDeltas.get(opId)
      : undefined
    await offlineSyncDb.pendingDeltas.update(opId, patch)

    if (summarySnapshotCache && existing) {
      queuePendingDeltaMutation(existing, { ...existing, ...patch })
    }
  },

  async removePendingDelta(opId: string) {
    const existing = summarySnapshotCache
      ? await offlineSyncDb.pendingDeltas.get(opId)
      : undefined
    await offlineSyncDb.pendingDeltas.delete(opId)

    if (summarySnapshotCache && existing) {
      queuePendingDeltaMutation(existing, undefined)
    }
  },

  async getPendingByEntity(entityType: string, entityId: string) {
    return offlineSyncDb.pendingDeltas
      .where('[entityType+entityId]')
      .equals([entityType, entityId])
      .sortBy('createdAt')
  },

  async getQueuedByIntent(intent: string) {
    return offlineSyncDb.pendingDeltas
      .where({ intent, state: 'queued' })
      .toArray()
  },

  async getAllByIntent(intent: string) {
    return offlineSyncDb.pendingDeltas.where({ intent }).sortBy('createdAt')
  },

  async listPendingDeltas() {
    return offlineSyncDb.pendingDeltas.orderBy('createdAt').toArray()
  },

  async getSummarySnapshot() {
    return hydrateSummarySnapshot()
  },

  async removePendingDeltas(opIds: string[]) {
    const existing = summarySnapshotCache
      ? (
          await Promise.all(
            opIds.map((opId) => offlineSyncDb.pendingDeltas.get(opId))
          )
        ).filter(Boolean)
      : []

    await offlineSyncDb.pendingDeltas.bulkDelete(opIds)

    if (summarySnapshotCache) {
      existing.forEach((delta) => {
        queuePendingDeltaMutation(
          delta as PendingDeltaRecord<unknown>,
          undefined
        )
      })
    }
  },

  async saveConflict(conflict: OfflineConflictRecord<unknown>) {
    await offlineSyncDb.conflictRecords.put(toConflictRow(conflict))

    queueConflictMutation(undefined, conflict)
  },

  async listConflictsByEntity(entityType: string, entityId: string) {
    return offlineSyncDb.conflictRecords
      .where('[entityType+entityId]')
      .equals([entityType, entityId])
      .sortBy('createdAt')
  },

  async listConflictsByEntityType(entityType: string) {
    return offlineSyncDb.conflictRecords
      .where({ entityType })
      .sortBy('createdAt')
  },

  async listOpenConflicts() {
    return offlineSyncDb.conflictRecords
      .filter((conflict) => !conflict.resolvedAt)
      .sortBy('createdAt')
  },

  async getConflict(conflictId: string) {
    return offlineSyncDb.conflictRecords.get(conflictId)
  },

  async markConflictResolved(
    conflictId: string,
    resolvedAt: string,
    resolvedStrategy: 'discard' | 'retry'
  ) {
    const existing = summarySnapshotCache
      ? await offlineSyncDb.conflictRecords.get(conflictId)
      : undefined
    await offlineSyncDb.conflictRecords.update(conflictId, {
      resolvedAt,
      resolvedStrategy,
    })

    if (summarySnapshotCache && existing) {
      queueConflictMutation(existing, {
        ...existing,
        resolvedAt,
        resolvedStrategy,
      })
    }
  },

  async removeConflict(conflictId: string) {
    const existing = summarySnapshotCache
      ? await offlineSyncDb.conflictRecords.get(conflictId)
      : undefined
    await offlineSyncDb.conflictRecords.delete(conflictId)

    if (summarySnapshotCache && existing) {
      queueConflictMutation(existing, undefined)
    }
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
