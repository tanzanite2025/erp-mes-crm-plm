import type { DeltaSet } from '@/lib/delta/types'
import type { PDAScanPayload, WarehouseCommandAck } from '../data/schema'

export interface StocktakeConflictFieldDiff {
  path: string
  oldValue: unknown
  newValue: unknown
}

export interface StocktakeConflictMergeSuggestion {
  strategy: 'retry_with_latest_version' | 'discard_local_change' | 'manual_review'
  label: string
  reason: string
}

export interface StocktakeOfflineSubmitResult {
  status: 'queued' | 'synced' | 'conflict'
  opId: string
  ack?: WarehouseCommandAck
}

export interface StocktakeQueuedScanPayload extends PDAScanPayload {
  localCreatedAt: string
}

export interface StocktakePendingScanRecord {
  opId: string
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  createdAt: string
  updatedAt: string
  state: 'queued' | 'syncing' | 'conflict' | 'expired'
  lastError?: string
}

export interface StocktakeFlushResult {
  syncedCount: number
  failedCount: number
  remainingCount: number
}

export interface StocktakeQueuedPatchPayload {
  itemId: string
  taskId: string
  delta: DeltaSet
  version: number
  localCreatedAt: string
}

export interface StocktakePatchInput {
  itemId: string
  taskId: string
  delta: DeltaSet
  version: number
}

export interface StocktakePendingPatchRecord {
  opId: string
  itemId: string
  taskId: string
  version: number
  path: string
  createdAt: string
  updatedAt: string
  state: 'queued' | 'syncing' | 'conflict' | 'expired'
  lastError?: string
}

export interface StocktakePatchFlushResult {
  syncedCount: number
  conflictCount: number
  failedCount: number
  remainingCount: number
}

export interface StocktakeConflictRecord {
  conflictId: string
  opId: string
  itemId: string
  taskId: string
  path: string
  version: number
  reason: 'version_conflict' | 'server_reject' | 'local_divergence'
  errorMessage?: string
  createdAt: string
  resolvedAt?: string
  resolvedStrategy?: 'discard' | 'retry'
  status: 'open' | 'resolved'
  fieldDiffs: StocktakeConflictFieldDiff[]
  mergeSuggestion: StocktakeConflictMergeSuggestion
}
