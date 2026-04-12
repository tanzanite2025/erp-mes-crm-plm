export type OfflineEntityType = 'warehouse.stocktake.scan' | 'warehouse.stocktake.item'

export type OfflineSyncState = 'queued' | 'syncing' | 'conflict' | 'expired'

export interface OfflineEntitySnapshot<TData = unknown> {
  entityType: OfflineEntityType | (string & {})
  entityId: string
  version: number
  data: TData
  syncedAt: string
}

export interface PendingDeltaRecord<TPayload = unknown> {
  opId: string
  clientId: string
  entityType: OfflineEntityType | (string & {})
  entityId: string
  path: string
  o: unknown
  n: TPayload
  baseVersion: number
  intent: string
  createdAt: string
  updatedAt: string
  state: OfflineSyncState
  batchId?: string
  lastError?: string
}

export interface OfflineSyncMeta {
  entityType: OfflineEntityType | (string & {})
  entityId: string
  latestAckVersion: number
  lastSyncAt?: string
  hasConflict: boolean
  queueState: OfflineSyncState | 'idle'
}

export interface OfflineConflictRecord<TPayload = unknown> {
  conflictId: string
  entityType: OfflineEntityType | (string & {})
  entityId: string
  opId: string
  path: string
  baseVersion: number
  serverVersion?: number
  reason: 'version_conflict' | 'server_reject' | 'local_divergence'
  payload: TPayload
  errorMessage?: string
  createdAt: string
  resolvedAt?: string
  resolvedStrategy?: 'discard' | 'retry'
}
