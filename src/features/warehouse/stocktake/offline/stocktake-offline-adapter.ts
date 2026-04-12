import { createLogger } from '@/lib/logger'
import { OfflineStorage } from '@/offline-sync/storage/offline-storage'
import type { OfflineConflictRecord, PendingDeltaRecord } from '@/offline-sync/types/offline-sync'
import type { DeltaSet } from '@/lib/delta/types'
import { StocktakeCoreService } from '../services/stocktake-core-service'
import { StocktakeMaintenanceService } from '../services/stocktake-maintenance-service'
import type { PDAScanPayload } from '../data/schema'
import type {
  StocktakeConflictFieldDiff,
  StocktakeConflictMergeSuggestion,
  StocktakeConflictRecord,
  StocktakeFlushResult,
  StocktakeOfflineSubmitResult,
  StocktakePatchFlushResult,
  StocktakePatchInput,
  StocktakePendingScanRecord,
  StocktakePendingPatchRecord,
  StocktakeQueuedPatchPayload,
  StocktakeQueuedScanPayload,
} from './stocktake-offline-types'

const logger = createLogger('StocktakeOfflineAdapter')

const STOCKTAKE_SCAN_ENTITY_TYPE = 'warehouse.stocktake.scan'
const STOCKTAKE_SCAN_INTENT = 'PDA_SUBMIT_SCAN'
const STOCKTAKE_ITEM_ENTITY_TYPE = 'warehouse.stocktake.item'
const STOCKTAKE_PATCH_INTENT = 'PDA_STOCKTAKE_PATCH'
const CLIENT_ID_STORAGE_KEY = 'xdfc_offline_client_id'

function getClientId() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return 'server'
  }

  const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing) return existing

  const next = `client_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next)
  return next
}

function buildScanOpId(payload: PDAScanPayload, createdAt: string) {
  return [
    'stocktake_scan',
    payload.taskId,
    payload.materialCode.trim().toUpperCase(),
    payload.batchNo.trim().toUpperCase(),
    createdAt,
  ].join('_')
}

function buildScanPath(payload: PDAScanPayload) {
  return `stocktake.scan.${payload.materialCode.trim().toUpperCase()}.${payload.batchNo.trim().toUpperCase()}`
}

function buildPatchPath(delta: DeltaSet) {
  const keys = Object.keys(delta).sort()
  return keys.length > 0 ? keys.join('|') : 'stocktake.patch'
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function shouldQueueOffline(error: unknown) {
  if (!isOnline()) return true
  if (!(error instanceof Error)) return false

  return (
    error.message.includes('[TIMEOUT]') ||
    error.message.includes('[CIRCUIT_BREAKER]') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError')
  )
}

function toQueuedPayload(payload: PDAScanPayload, createdAt: string): StocktakeQueuedScanPayload {
  return {
    ...payload,
    localCreatedAt: createdAt,
  }
}

function toQueuedPatchPayload(input: StocktakePatchInput, createdAt: string): StocktakeQueuedPatchPayload {
  return {
    itemId: input.itemId,
    taskId: input.taskId,
    delta: input.delta,
    version: input.version,
    localCreatedAt: createdAt,
  }
}

function buildPendingDelta(payload: PDAScanPayload, createdAt: string): PendingDeltaRecord<StocktakeQueuedScanPayload> {
  return {
    opId: buildScanOpId(payload, createdAt),
    clientId: getClientId(),
    entityType: STOCKTAKE_SCAN_ENTITY_TYPE,
    entityId: payload.taskId,
    path: buildScanPath(payload),
    o: null,
    n: toQueuedPayload(payload, createdAt),
    baseVersion: 0,
    intent: STOCKTAKE_SCAN_INTENT,
    createdAt,
    updatedAt: createdAt,
    state: 'queued',
  }
}

function buildPatchOpId(input: StocktakePatchInput, createdAt: string) {
  return ['stocktake_patch', input.itemId, input.version, createdAt].join('_')
}

function buildPatchDelta(input: StocktakePatchInput, createdAt: string): PendingDeltaRecord<StocktakeQueuedPatchPayload> {
  return {
    opId: buildPatchOpId(input, createdAt),
    clientId: getClientId(),
    entityType: STOCKTAKE_ITEM_ENTITY_TYPE,
    entityId: input.itemId,
    path: buildPatchPath(input.delta),
    o: null,
    n: toQueuedPatchPayload(input, createdAt),
    baseVersion: input.version,
    intent: STOCKTAKE_PATCH_INTENT,
    createdAt,
    updatedAt: createdAt,
    state: 'queued',
  }
}

async function persistQueuedScan(delta: PendingDeltaRecord<StocktakeQueuedScanPayload>) {
  await OfflineStorage.transaction(async () => {
    await OfflineStorage.enqueueDelta(delta)
    const existingMeta = await OfflineStorage.getSyncMeta(delta.entityType, delta.entityId)
    await OfflineStorage.upsertSyncMeta({
      entityType: delta.entityType,
      entityId: delta.entityId,
      latestAckVersion: existingMeta?.latestAckVersion ?? 0,
      lastSyncAt: existingMeta?.lastSyncAt,
      hasConflict: existingMeta?.hasConflict ?? false,
      queueState: 'queued',
    })
  })
}

async function persistQueuedPatch(delta: PendingDeltaRecord<StocktakeQueuedPatchPayload>) {
  await OfflineStorage.transaction(async () => {
    await OfflineStorage.enqueueDelta(delta)
    const existingMeta = await OfflineStorage.getSyncMeta(delta.entityType, delta.entityId)
    await OfflineStorage.upsertSyncMeta({
      entityType: delta.entityType,
      entityId: delta.entityId,
      latestAckVersion: existingMeta?.latestAckVersion ?? Math.max(delta.baseVersion, 0),
      lastSyncAt: existingMeta?.lastSyncAt,
      hasConflict: existingMeta?.hasConflict ?? false,
      queueState: 'queued',
    })
  })
}

async function markSynced(delta: PendingDeltaRecord<StocktakeQueuedScanPayload>) {
  const syncedAt = new Date().toISOString()
  await OfflineStorage.transaction(async () => {
    await OfflineStorage.removePendingDelta(delta.opId)
    const existingMeta = await OfflineStorage.getSyncMeta(delta.entityType, delta.entityId)
    await OfflineStorage.upsertSyncMeta({
      entityType: delta.entityType,
      entityId: delta.entityId,
      latestAckVersion: existingMeta?.latestAckVersion ?? 0,
      lastSyncAt: syncedAt,
      hasConflict: false,
      queueState: 'idle',
    })
  })
}

async function markQueuedWithError(opId: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error'
  await OfflineStorage.updatePendingDelta(opId, {
    state: 'queued',
    lastError: message,
    updatedAt: new Date().toISOString(),
  })
}

async function markConflict(
  delta: PendingDeltaRecord<StocktakeQueuedPatchPayload>,
  reason: OfflineConflictRecord['reason'],
  error: unknown,
  serverVersion?: number
) {
  const createdAt = new Date().toISOString()
  const message = error instanceof Error ? error.message : 'Unknown error'

  await OfflineStorage.transaction(async () => {
    await OfflineStorage.updatePendingDelta(delta.opId, {
      state: 'conflict',
      lastError: message,
      updatedAt: createdAt,
    })

    await OfflineStorage.saveConflict({
      conflictId: `conflict_${delta.opId}`,
      entityType: delta.entityType,
      entityId: delta.entityId,
      opId: delta.opId,
      path: delta.path,
      baseVersion: delta.baseVersion,
      serverVersion,
      reason,
      payload: delta.n,
      errorMessage: message,
      createdAt,
    })

    const existingMeta = await OfflineStorage.getSyncMeta(delta.entityType, delta.entityId)
    await OfflineStorage.upsertSyncMeta({
      entityType: delta.entityType,
      entityId: delta.entityId,
      latestAckVersion: existingMeta?.latestAckVersion ?? delta.baseVersion,
      lastSyncAt: existingMeta?.lastSyncAt,
      hasConflict: true,
      queueState: 'conflict',
    })
  })
}

function toPendingRecord(delta: PendingDeltaRecord<StocktakeQueuedScanPayload>): StocktakePendingScanRecord {
  return {
    opId: delta.opId,
    taskId: delta.entityId,
    materialCode: delta.n.materialCode,
    batchNo: delta.n.batchNo,
    scannedQty: delta.n.scannedQty,
    createdAt: delta.createdAt,
    updatedAt: delta.updatedAt,
    state: delta.state,
    lastError: delta.lastError,
  }
}

function toPendingPatchRecord(delta: PendingDeltaRecord<StocktakeQueuedPatchPayload>): StocktakePendingPatchRecord {
  return {
    opId: delta.opId,
    itemId: delta.entityId,
    taskId: delta.n.taskId,
    version: delta.baseVersion,
    path: delta.path,
    createdAt: delta.createdAt,
    updatedAt: delta.updatedAt,
    state: delta.state,
    lastError: delta.lastError,
  }
}

function buildFieldDiffs(conflict: OfflineConflictRecord<StocktakeQueuedPatchPayload>): StocktakeConflictFieldDiff[] {
  return Object.entries(conflict.payload.delta).map(([path, change]) => ({
    path,
    oldValue: change.o,
    newValue: change.n,
  }))
}

function buildMergeSuggestion(conflict: OfflineConflictRecord<StocktakeQueuedPatchPayload>): StocktakeConflictMergeSuggestion {
  if (conflict.reason === 'version_conflict') {
    return {
      strategy: 'retry_with_latest_version',
      label: '刷新后重试',
      reason: '服务端版本已变化，建议刷新最新盘点项后使用新版本重放本地 patch。',
    }
  }

  if (conflict.reason === 'server_reject') {
    return {
      strategy: 'manual_review',
      label: '人工复核',
      reason: '后端已拒绝当前 patch，建议先人工确认字段差异再决定是否重试。',
    }
  }

  return {
    strategy: 'discard_local_change',
    label: '清除本地变更',
    reason: '本地变更已与服务端状态分叉，建议先丢弃当前离线 patch。',
  }
}

function toConflictRecord(conflict: OfflineConflictRecord<StocktakeQueuedPatchPayload>): StocktakeConflictRecord {
  return {
    conflictId: conflict.conflictId,
    opId: conflict.opId,
    itemId: conflict.entityId,
    taskId: conflict.payload.taskId,
    path: conflict.path,
    version: conflict.baseVersion,
    reason: conflict.reason,
    errorMessage: conflict.errorMessage,
    createdAt: conflict.createdAt,
    resolvedAt: conflict.resolvedAt,
    resolvedStrategy: conflict.resolvedStrategy,
    status: conflict.resolvedAt ? 'resolved' : 'open',
    fieldDiffs: buildFieldDiffs(conflict),
    mergeSuggestion: buildMergeSuggestion(conflict),
  }
}

function groupQueuedScansByTask(deltas: PendingDeltaRecord<StocktakeQueuedScanPayload>[]) {
  return deltas.reduce<Record<string, PendingDeltaRecord<StocktakeQueuedScanPayload>[]>>((groups, delta) => {
    if (!groups[delta.entityId]) {
      groups[delta.entityId] = []
    }

    groups[delta.entityId].push(delta)
    return groups
  }, {})
}

async function markSyncing(opIds: string[]) {
  const updatedAt = new Date().toISOString()
  await Promise.all(
    opIds.map((opId) =>
      OfflineStorage.updatePendingDelta(opId, {
        state: 'syncing',
        updatedAt,
      })
    )
  )
}

async function restoreQueued(opIds: string[], error: unknown) {
  await Promise.all(opIds.map((opId) => markQueuedWithError(opId, error)))
}

async function flushQueuedScansInternal(): Promise<StocktakeFlushResult> {
  const queued = (await OfflineStorage.getQueuedByIntent(STOCKTAKE_SCAN_INTENT)) as PendingDeltaRecord<StocktakeQueuedScanPayload>[]

  if (queued.length === 0) {
    return {
      syncedCount: 0,
      failedCount: 0,
      remainingCount: 0,
    }
  }

  if (!isOnline()) {
    return {
      syncedCount: 0,
      failedCount: 0,
      remainingCount: queued.length,
    }
  }

  let syncedCount = 0
  let failedCount = 0
  const groups = groupQueuedScansByTask(queued)

  for (const deltas of Object.values(groups)) {
    const opIds = deltas.map((delta) => delta.opId)
    await markSyncing(opIds)

    try {
      const scans = deltas.map((delta) => delta.n)

      if (scans.length === 1) {
        await StocktakeMaintenanceService.pdaSubmitScan(scans[0])
      } else {
        await StocktakeMaintenanceService.pdaBulkSync(scans)
      }

      syncedCount += deltas.length
      await OfflineStorage.removePendingDeltas(opIds)

      const lastEntityId = deltas[deltas.length - 1]?.entityId
      if (lastEntityId) {
        await OfflineStorage.upsertSyncMeta({
          entityType: STOCKTAKE_SCAN_ENTITY_TYPE,
          entityId: lastEntityId,
          latestAckVersion: 0,
          lastSyncAt: new Date().toISOString(),
          hasConflict: false,
          queueState: 'idle',
        })
      }
    } catch (error) {
      failedCount += deltas.length
      await restoreQueued(opIds, error)
      logger.warn('PDA bulk flush failed', { taskId: deltas[0]?.entityId, count: deltas.length })
    }
  }

  const remaining = await OfflineStorage.getQueuedByIntent(STOCKTAKE_SCAN_INTENT)

  return {
    syncedCount,
    failedCount,
    remainingCount: remaining.length,
  }
}

function isVersionConflictError(error: unknown): error is Error & { status?: number; isConflict?: boolean } {
  if (!error || typeof error !== 'object') return false
  const candidate = error as Error & { status?: number; isConflict?: boolean }
  return candidate.isConflict === true || candidate.status === 409
}

async function flushQueuedPatchesInternal(): Promise<StocktakePatchFlushResult> {
  const queued = (await OfflineStorage.getQueuedByIntent(STOCKTAKE_PATCH_INTENT)) as PendingDeltaRecord<StocktakeQueuedPatchPayload>[]

  if (queued.length === 0) {
    return { syncedCount: 0, conflictCount: 0, failedCount: 0, remainingCount: 0 }
  }

  if (!isOnline()) {
    return { syncedCount: 0, conflictCount: 0, failedCount: 0, remainingCount: queued.length }
  }

  let syncedCount = 0
  let conflictCount = 0
  let failedCount = 0

  for (const delta of queued) {
    await OfflineStorage.updatePendingDelta(delta.opId, {
      state: 'syncing',
      updatedAt: new Date().toISOString(),
    })

    try {
      await StocktakeMaintenanceService.pdaPatchItem(delta.n.itemId, delta.n.delta, delta.n.version)

      syncedCount += 1
      await OfflineStorage.transaction(async () => {
        await OfflineStorage.removePendingDelta(delta.opId)
        const existingMeta = await OfflineStorage.getSyncMeta(delta.entityType, delta.entityId)
        await OfflineStorage.upsertSyncMeta({
          entityType: delta.entityType,
          entityId: delta.entityId,
          latestAckVersion: Math.max(existingMeta?.latestAckVersion ?? 0, delta.baseVersion + 1),
          lastSyncAt: new Date().toISOString(),
          hasConflict: false,
          queueState: 'idle',
        })
      })
    } catch (error) {
      if (isVersionConflictError(error)) {
        conflictCount += 1
        await markConflict(delta, 'version_conflict', error)
        continue
      }

      if (shouldQueueOffline(error)) {
        failedCount += 1
        await markQueuedWithError(delta.opId, error)
        continue
      }

      conflictCount += 1
      await markConflict(delta, 'server_reject', error)
    }
  }

  const remaining = await OfflineStorage.getQueuedByIntent(STOCKTAKE_PATCH_INTENT)
  return {
    syncedCount,
    conflictCount,
    failedCount,
    remainingCount: remaining.length,
  }
}

export const StocktakeOfflineAdapter = {
  async submitScan(payload: PDAScanPayload): Promise<StocktakeOfflineSubmitResult> {
    const createdAt = new Date().toISOString()
    const delta = buildPendingDelta(payload, createdAt)

    await persistQueuedScan(delta)

    if (!isOnline()) {
      return {
        status: 'queued',
        opId: delta.opId,
      }
    }

    try {
      const ack = await StocktakeMaintenanceService.pdaSubmitScan(payload)
      await markSynced(delta)
      return {
        status: 'synced',
        opId: delta.opId,
        ack,
      }
    } catch (error) {
      if (shouldQueueOffline(error)) {
        await markQueuedWithError(delta.opId, error)
        logger.warn('PDA scan queued for retry', { opId: delta.opId, taskId: payload.taskId })
        return {
          status: 'queued',
          opId: delta.opId,
        }
      }

      await OfflineStorage.removePendingDelta(delta.opId)
      throw error
    }
  },

  async listPendingScans(): Promise<StocktakePendingScanRecord[]> {
    const pending = (await OfflineStorage.getAllByIntent(STOCKTAKE_SCAN_INTENT)) as PendingDeltaRecord<StocktakeQueuedScanPayload>[]
    return pending.map(toPendingRecord)
  },

  async flushQueuedScans(): Promise<StocktakeFlushResult> {
    return flushQueuedScansInternal()
  },

  async submitPatchItem(input: StocktakePatchInput): Promise<StocktakeOfflineSubmitResult> {
    const createdAt = new Date().toISOString()
    const delta = buildPatchDelta(input, createdAt)

    await persistQueuedPatch(delta)

    if (!isOnline()) {
      return {
        status: 'queued',
        opId: delta.opId,
      }
    }

    try {
      const ack = await StocktakeMaintenanceService.pdaPatchItem(input.itemId, input.delta, input.version)
      await OfflineStorage.transaction(async () => {
        await OfflineStorage.removePendingDelta(delta.opId)
        await OfflineStorage.upsertSyncMeta({
          entityType: delta.entityType,
          entityId: delta.entityId,
          latestAckVersion: input.version + 1,
          lastSyncAt: new Date().toISOString(),
          hasConflict: false,
          queueState: 'idle',
        })
      })

      return {
        status: 'synced',
        opId: delta.opId,
        ack,
      }
    } catch (error) {
      if (shouldQueueOffline(error)) {
        await markQueuedWithError(delta.opId, error)
        return {
          status: 'queued',
          opId: delta.opId,
        }
      }

      if (isVersionConflictError(error)) {
        await markConflict(delta, 'version_conflict', error)
        return {
          status: 'conflict',
          opId: delta.opId,
        }
      }

      await markConflict(delta, 'server_reject', error)
      return {
        status: 'conflict',
        opId: delta.opId,
      }
    }
  },

  async listPendingPatches(): Promise<StocktakePendingPatchRecord[]> {
    const pending = (await OfflineStorage.getAllByIntent(STOCKTAKE_PATCH_INTENT)) as PendingDeltaRecord<StocktakeQueuedPatchPayload>[]
    return pending.map(toPendingPatchRecord)
  },

  async flushQueuedPatches(): Promise<StocktakePatchFlushResult> {
    return flushQueuedPatchesInternal()
  },

  async listConflicts(taskId?: string): Promise<StocktakeConflictRecord[]> {
    const conflicts = (await OfflineStorage.listConflictsByEntityType(STOCKTAKE_ITEM_ENTITY_TYPE)) as OfflineConflictRecord<StocktakeQueuedPatchPayload>[]
    return conflicts
      .filter((item) => !item.resolvedAt)
      .filter((item) => !taskId || item.payload.taskId === taskId)
      .map(toConflictRecord)
  },

  async listResolvedConflicts(taskId?: string): Promise<StocktakeConflictRecord[]> {
    const conflicts = (await OfflineStorage.listConflictsByEntityType(STOCKTAKE_ITEM_ENTITY_TYPE)) as OfflineConflictRecord<StocktakeQueuedPatchPayload>[]
    return conflicts
      .filter((item) => Boolean(item.resolvedAt))
      .filter((item) => !taskId || item.payload.taskId === taskId)
      .map(toConflictRecord)
  },

  async clearConflict(conflictId: string) {
    await OfflineStorage.removeConflict(conflictId)
  },

  async resolveConflict(conflictId: string) {
    const conflict = (await OfflineStorage.getConflict(conflictId)) as OfflineConflictRecord<StocktakeQueuedPatchPayload> | undefined
    if (!conflict) return

    await OfflineStorage.transaction(async () => {
      await OfflineStorage.removePendingDelta(conflict.opId)
      await OfflineStorage.markConflictResolved(conflictId, new Date().toISOString(), 'discard')

      const remainingConflicts = (await OfflineStorage.listConflictsByEntity(conflict.entityType, conflict.entityId)) as OfflineConflictRecord<StocktakeQueuedPatchPayload>[]
      const hasUnresolved = remainingConflicts.some((item) => item.conflictId !== conflictId && !item.resolvedAt)
      const hasQueued = (await OfflineStorage.getPendingByEntity(conflict.entityType, conflict.entityId)).some((item) => item.state === 'queued' || item.state === 'syncing' || item.state === 'conflict')
      const existingMeta = await OfflineStorage.getSyncMeta(conflict.entityType, conflict.entityId)

      await OfflineStorage.upsertSyncMeta({
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        latestAckVersion: existingMeta?.latestAckVersion ?? conflict.baseVersion,
        lastSyncAt: existingMeta?.lastSyncAt,
        hasConflict: hasUnresolved,
        queueState: hasUnresolved ? 'conflict' : hasQueued ? 'queued' : 'idle',
      })
    })
  },

  async retryConflictAfterRefresh(conflictId: string): Promise<StocktakeOfflineSubmitResult> {
    const conflict = (await OfflineStorage.getConflict(conflictId)) as OfflineConflictRecord<StocktakeQueuedPatchPayload> | undefined
    if (!conflict) {
      throw new Error('未找到可重试的冲突记录')
    }

    const latestItems = await StocktakeCoreService.getItems(conflict.payload.taskId)
    const latestItem = latestItems.find((item) => item.id === conflict.entityId)
    if (!latestItem) {
      throw new Error('刷新后未找到对应盘点项')
    }

    await OfflineStorage.transaction(async () => {
      await OfflineStorage.removePendingDelta(conflict.opId)
      await OfflineStorage.markConflictResolved(conflictId, new Date().toISOString(), 'retry')
      const existingMeta = await OfflineStorage.getSyncMeta(conflict.entityType, conflict.entityId)
      await OfflineStorage.upsertSyncMeta({
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        latestAckVersion: Math.max(existingMeta?.latestAckVersion ?? 0, latestItem.version),
        lastSyncAt: existingMeta?.lastSyncAt,
        hasConflict: false,
        queueState: 'idle',
      })
    })

    return this.submitPatchItem({
      itemId: latestItem.id,
      taskId: conflict.payload.taskId,
      delta: conflict.payload.delta,
      version: latestItem.version,
    })
  },

  registerAutoFlush(onSettled?: () => void) {
    if (typeof window === 'undefined') {
      return () => undefined
    }

    const handleOnline = () => {
      void Promise.all([flushQueuedScansInternal(), flushQueuedPatchesInternal()]).finally(() => {
        onSettled?.()
      })
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  },
}
