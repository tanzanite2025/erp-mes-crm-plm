import { PurchaseLogisticsService } from './purchase-logistics-service'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { createLogger } from '@/lib/logger'

export const PURCHASE_LOGISTICS_DRAFT_KEY = 'xdfc_purchase_logistics_offline_drafts_v1'
const PURCHASE_LOGISTICS_DRAFT_LIMIT = 200

const logger = createLogger('PurchaseLogisticsOfflineDrafts')

// 【单例 Store】物理内存镜像，确保引用稳定性情况情况总量针对。情况总量情况情况情况情况。
let draftsSnapshot: PurchaseLogisticsOfflineDraft[] = []
let isInitialized = false
let initializationPromise: Promise<void> | null = null

/**
 * 确保单例初始化：仅在首次访问或外部变化时从持久层同步情况情况总量针对。情况总量情况情况情况情况。
 */
async function ensureInitialized() {
  if (isInitialized) return
  if (!initializationPromise) {
    initializationPromise = readDrafts()
      .then((drafts) => {
        draftsSnapshot = drafts
        isInitialized = true
      })
      .finally(() => {
        initializationPromise = null
      })
  }
  await initializationPromise
}

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
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
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

async function readDrafts() {
  if (!canUseStorage()) return []

  try {
    const raw = await StorageService.getItem<unknown>(PURCHASE_LOGISTICS_DRAFT_KEY)
    if (!raw) return []
    if (!Array.isArray(raw)) return []
    return raw
      .map((item) => normalizeDraft(item || {}))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  } catch (error) {
    logger.error('Failed to read drafts', error)
    return []
  }
}

/**
 * 核心写入逻辑：仅在数据发生实质变化时更新内存引用并触发派发事件情况情况总量针对。
 */
async function writeDrafts(drafts: PurchaseLogisticsOfflineDraft[]) {
  if (!canUseStorage()) return

  try {
    const normalized = drafts
      .map((draft) => normalizeDraft(draft))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, PURCHASE_LOGISTICS_DRAFT_LIMIT)

    const nextSerialized = JSON.stringify(normalized)
    const prevSerialized = JSON.stringify(draftsSnapshot)

    // 【引用稳定性检查】若内容未变，严禁更新引用情况情况总量针对。情况总量情况情况情况情况。
    if (nextSerialized === prevSerialized && isInitialized) {
      return
    }

    await StorageService.setItem(PURCHASE_LOGISTICS_DRAFT_KEY, normalized)
    draftsSnapshot = normalized
    isInitialized = true
  } catch (error) {
    logger.error('Failed to write drafts', error)
  }
}

export function invalidatePurchaseLogisticsOfflineDraftCache() {
  isInitialized = false
  initializationPromise = null
}

export async function listPurchaseLogisticsOfflineDrafts() {
  await ensureInitialized()
  return draftsSnapshot
}

export async function queuePurchaseLogisticsOfflineDraft(
  input: PurchaseLogisticsOfflineDraftInput,
  lastError?: string
) {
  const drafts = await readDrafts()
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
    await writeDrafts([nextDraft, ...drafts.filter((draft) => draft.id !== existing.id)])
    return nextDraft
  }

  await writeDrafts([normalized, ...drafts])
  return normalized
}

export async function removePurchaseLogisticsOfflineDraft(id: string) {
  const drafts = await readDrafts()
  await writeDrafts(drafts.filter((draft) => draft.id !== id))
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
  const drafts = await readDrafts()

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

  await writeDrafts(nextDrafts)

  return {
    syncedCount,
    failedCount,
    blockedCount: nextDrafts.filter((draft) => draft.syncStatus === 'blocked').length,
    remainingCount: nextDrafts.length,
  }
}
