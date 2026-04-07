import { PurchaseLogisticsService } from './purchase-logistics-service'
import { createLogger } from '@/lib/logger'

const PURCHASE_LOGISTICS_DRAFT_KEY = 'xdfc_purchase_logistics_offline_drafts_v1'
const PURCHASE_LOGISTICS_DRAFT_EVENT = 'xdfc:purchase-logistics-offline-drafts'
const PURCHASE_LOGISTICS_DRAFT_LIMIT = 200

const logger = createLogger('PurchaseLogisticsOfflineDrafts')
let draftsSnapshot: PurchaseLogisticsOfflineDraft[] = []

export interface PurchaseLogisticsOfflineDraftInput {
  purchaseOrderId: string
  orderNo: string
  carrier: string
  trackingNo: string
}

export interface PurchaseLogisticsOfflineDraft extends PurchaseLogisticsOfflineDraftInput {
  id: string
  createdAt: string
  updatedAt: string
  attempts: number
  lastError?: string
  syncStatus: 'pending' | 'blocked'
}

interface SyncPurchaseLogisticsOfflineDraftsResult {
  syncedCount: number
  failedCount: number
  blockedCount: number
  remainingCount: number
}

interface ApiLikeError extends Error {
  status?: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function emitDraftsChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(PURCHASE_LOGISTICS_DRAFT_EVENT))
}

function buildDraftId() {
  return `purchase_logistics_draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function buildDedupeKey(input: PurchaseLogisticsOfflineDraftInput) {
  return [
    (input.purchaseOrderId || '').trim(),
    (input.trackingNo || '').trim().toUpperCase(),
  ].join('|')
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown error'
}

function isBlockedSyncError(error: unknown) {
  const status = (error as ApiLikeError | undefined)?.status
  return typeof status === 'number' && status >= 400 && status < 500 && status !== 408 && status !== 429
}

function normalizeDraft(
  draft: Partial<PurchaseLogisticsOfflineDraft> & PurchaseLogisticsOfflineDraftInput
): PurchaseLogisticsOfflineDraft {
  const now = new Date().toISOString()
  return {
    id: draft.id || buildDraftId(),
    purchaseOrderId: (draft.purchaseOrderId || '').trim(),
    orderNo: (draft.orderNo || '').trim(),
    carrier: (draft.carrier || '').trim(),
    trackingNo: (draft.trackingNo || '').trim().toUpperCase(),
    createdAt: draft.createdAt || now,
    updatedAt: draft.updatedAt || draft.createdAt || now,
    attempts: draft.attempts ?? 0,
    lastError: draft.lastError,
    syncStatus: draft.syncStatus === 'blocked' ? 'blocked' : 'pending',
  }
}

function readDrafts() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(PURCHASE_LOGISTICS_DRAFT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeDraft(item || {}))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch (error) {
    logger.error('Failed to read drafts', error)
    return []
  }
}

function writeDrafts(drafts: PurchaseLogisticsOfflineDraft[]) {
  if (!canUseStorage()) return

  try {
    const normalized = drafts
      .map((draft) => normalizeDraft(draft))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, PURCHASE_LOGISTICS_DRAFT_LIMIT)

    window.localStorage.setItem(PURCHASE_LOGISTICS_DRAFT_KEY, JSON.stringify(normalized))
    draftsSnapshot = normalized
    emitDraftsChanged()
  } catch (error) {
    logger.error('Failed to write drafts', error)
  }
}

export function listPurchaseLogisticsOfflineDrafts() {
  return readDrafts()
}

export function getPurchaseLogisticsOfflineDraftsSnapshot() {
  if (!canUseStorage()) {
    return draftsSnapshot
  }

  try {
    const raw = window.localStorage.getItem(PURCHASE_LOGISTICS_DRAFT_KEY)
    if (!raw) {
      draftsSnapshot = []
      return draftsSnapshot
    }

    const nextDrafts = readDrafts()
    const nextSerialized = JSON.stringify(nextDrafts)
    const currentSerialized = JSON.stringify(draftsSnapshot)

    if (nextSerialized !== currentSerialized) {
      draftsSnapshot = nextDrafts
    }

    return draftsSnapshot
  } catch (error) {
    logger.error('Failed to get drafts snapshot', error)
    draftsSnapshot = []
    return draftsSnapshot
  }
}

export function subscribePurchaseLogisticsOfflineDrafts(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => undefined

  const handleChange = () => onStoreChange()
  window.addEventListener(PURCHASE_LOGISTICS_DRAFT_EVENT, handleChange)
  window.addEventListener('storage', handleChange)

  return () => {
    window.removeEventListener(PURCHASE_LOGISTICS_DRAFT_EVENT, handleChange)
    window.removeEventListener('storage', handleChange)
  }
}

export function queuePurchaseLogisticsOfflineDraft(
  input: PurchaseLogisticsOfflineDraftInput,
  lastError?: string
) {
  const drafts = readDrafts()
  const normalized = normalizeDraft({
    ...input,
    lastError,
    updatedAt: new Date().toISOString(),
    syncStatus: 'pending',
  })
  const dedupeKey = buildDedupeKey(normalized)
  const existing = drafts.find((draft) => buildDedupeKey(draft) === dedupeKey)

  if (existing) {
    const nextDraft = normalizeDraft({
      ...existing,
      ...normalized,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      attempts: 0,
      syncStatus: 'pending',
    })
    writeDrafts([nextDraft, ...drafts.filter((draft) => draft.id !== existing.id)])
    return nextDraft
  }

  writeDrafts([normalized, ...drafts])
  return normalized
}

export function removePurchaseLogisticsOfflineDraft(id: string) {
  writeDrafts(readDrafts().filter((draft) => draft.id !== id))
}

export function shouldQueuePurchaseLogisticsOfflineDraft(error: unknown) {
  if (!isOnline()) return true
  if (!(error instanceof Error)) return false

  return (
    error.message.includes('[TIMEOUT]') ||
    error.message.includes('[CIRCUIT_BREAKER]') ||
    error.message.includes('Failed to fetch') ||
    error.message.includes('NetworkError')
  )
}

export async function syncPurchaseLogisticsOfflineDrafts(): Promise<SyncPurchaseLogisticsOfflineDraftsResult> {
  const drafts = readDrafts()

  if (!isOnline() || drafts.length === 0) {
    return {
      syncedCount: 0,
      failedCount: 0,
      blockedCount: drafts.filter((draft) => draft.syncStatus === 'blocked').length,
      remainingCount: drafts.length,
    }
  }

  const nextDrafts: PurchaseLogisticsOfflineDraft[] = []
  let syncedCount = 0
  let failedCount = 0

  for (const draft of drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (draft.syncStatus === 'blocked') {
      nextDrafts.push(draft)
      continue
    }

    try {
      await PurchaseLogisticsService.saveRecord({
        purchaseOrderId: draft.purchaseOrderId,
        orderNo: draft.orderNo,
        carrier: draft.carrier,
        trackingNo: draft.trackingNo,
      })
      syncedCount += 1
    } catch (error) {
      failedCount += 1
      nextDrafts.push(
        normalizeDraft({
          ...draft,
          updatedAt: new Date().toISOString(),
          attempts: draft.attempts + 1,
          lastError: getErrorMessage(error),
          syncStatus: isBlockedSyncError(error) ? 'blocked' : 'pending',
        })
      )
    }
  }

  writeDrafts(nextDrafts)

  return {
    syncedCount,
    failedCount,
    blockedCount: nextDrafts.filter((draft) => draft.syncStatus === 'blocked').length,
    remainingCount: nextDrafts.length,
  }
}
