import type { PDAIngestRequest } from './pda-ingest-service'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { createLogger } from '@/lib/logger'
import {
  normalizeDeviceCode,
  normalizeMachineCode,
  normalizeMaterialCode,
  normalizeSceneKey,
  normalizeTaskKey,
} from '@/lib/codecs/code-normalization'

const PDA_SHELL_QUEUE_KEY = 'xdfc_pda_shell_retry_queue_v1'

const logger = createLogger('PDAShellQueue')

export interface PDAIngestRetryItem {
  id: string
  payload: PDAIngestRequest
  scene: string
  dedupeKey: string
  createdAt: string
  lastQueuedAt: string
  lastTriedAt?: string
  attempts: number
  duplicateCount: number
  lastError?: string
}

export interface PDAIngestRetrySceneGroup {
  scene: string
  count: number
  duplicateCount: number
  latestQueuedAt?: string
}

function buildDedupeKey(payload: PDAIngestRequest) {
  return [
    normalizeSceneKey(payload.scene),
    normalizeDeviceCode(payload.deviceId),
    normalizeMachineCode(payload.rawCode),
    normalizeTaskKey(payload.taskId),
    normalizeMaterialCode(payload.materialCode),
  ].join('|')
}

function normalizeRetryItem(item: Partial<PDAIngestRetryItem> & { payload?: PDAIngestRequest }) {
  const payload = item.payload || { rawCode: '' }
  const scene = normalizeSceneKey(item.scene || payload.scene)
  const dedupeKey = item.dedupeKey || buildDedupeKey(payload)
  const createdAt = item.createdAt || new Date().toISOString()

  return {
    id: item.id || `retry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    payload: {
      ...payload,
      scene,
      rawCode: normalizeMachineCode(payload.rawCode),
      deviceId: normalizeDeviceCode(payload.deviceId),
      materialCode: normalizeMaterialCode(payload.materialCode),
    },
    scene,
    dedupeKey,
    createdAt,
    lastQueuedAt: item.lastQueuedAt || createdAt,
    lastTriedAt: item.lastTriedAt,
    attempts: item.attempts ?? 0,
    duplicateCount: item.duplicateCount ?? 1,
    lastError: item.lastError,
  } satisfies PDAIngestRetryItem
}

function isLegacyStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseStoredQueue(raw: unknown, context: string) {
  if (raw == null) {
    return []
  }

  if (!Array.isArray(raw)) {
    throw new Error(`[CRITICAL] ${context} expected an array queue payload`)
  }

  return raw.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`[CRITICAL] ${context} encountered an invalid PDA queue item`)
    }

    return normalizeRetryItem(item as Partial<PDAIngestRetryItem> & { payload?: PDAIngestRequest })
  })
}

async function migrateLegacyQueueIfNeeded() {
  if (!isLegacyStorageAvailable()) {
    return null
  }

  const legacyRaw = window.localStorage.getItem(PDA_SHELL_QUEUE_KEY)
  if (!legacyRaw) {
    return null
  }

  const migratedQueue = parseStoredQueue(JSON.parse(legacyRaw), 'PDAShellQueue.migrateLegacyQueueIfNeeded')
  await StorageService.setItem(PDA_SHELL_QUEUE_KEY, migratedQueue)
  window.localStorage.removeItem(PDA_SHELL_QUEUE_KEY)
  logger.info('Migrated PDA shell retry queue from localStorage to IndexedDB', {
    count: migratedQueue.length,
  })
  return migratedQueue
}

async function readQueue() {
  const stored = await StorageService.getItem<unknown>(PDA_SHELL_QUEUE_KEY)
  if (stored !== null) {
    return parseStoredQueue(stored, 'PDAShellQueue.readQueue')
  }

  const migratedQueue = await migrateLegacyQueueIfNeeded()
  return migratedQueue ?? []
}

async function writeQueue(queue: PDAIngestRetryItem[]) {
  await StorageService.setItem(PDA_SHELL_QUEUE_KEY, queue)
}

export async function listPDAShellRetryQueue(scene?: string): Promise<PDAIngestRetryItem[]> {
  const queue = await readQueue()
  if (!scene) return queue
  const normalizedScene = normalizeSceneKey(scene)
  return queue.filter((item) => item.scene === normalizedScene)
}

export async function listPDAShellRetryQueueByScene(): Promise<PDAIngestRetrySceneGroup[]> {
  const sceneMap = new Map<string, PDAIngestRetrySceneGroup>()

  for (const item of await readQueue()) {
    const current = sceneMap.get(item.scene)
    if (!current) {
      sceneMap.set(item.scene, {
        scene: item.scene,
        count: 1,
        duplicateCount: item.duplicateCount,
        latestQueuedAt: item.lastQueuedAt,
      })
      continue
    }

    current.count += 1
    current.duplicateCount += item.duplicateCount
    if ((item.lastQueuedAt || '') > (current.latestQueuedAt || '')) {
      current.latestQueuedAt = item.lastQueuedAt
    }
  }

  return Array.from(sceneMap.values()).sort((a, b) =>
    (b.latestQueuedAt || '').localeCompare(a.latestQueuedAt || '')
  )
}

export async function enqueuePDAShellRetry(
  payload: PDAIngestRequest,
  lastError?: string
): Promise<PDAIngestRetryItem> {
  const queue = await readQueue()
  const normalizedPayload: PDAIngestRequest = {
    ...payload,
    scene: normalizeSceneKey(payload.scene),
    rawCode: normalizeMachineCode(payload.rawCode),
    deviceId: normalizeDeviceCode(payload.deviceId),
    materialCode: normalizeMaterialCode(payload.materialCode),
  }
  const dedupeKey = buildDedupeKey(normalizedPayload)
  const existing = queue.find((item) => item.dedupeKey === dedupeKey)
  const now = new Date().toISOString()

  if (existing) {
    const nextItem = normalizeRetryItem({
      ...existing,
      payload: normalizedPayload,
      lastQueuedAt: now,
      lastError,
      duplicateCount: existing.duplicateCount + 1,
    })
    const nextQueue = [nextItem, ...queue.filter((item) => item.id !== existing.id)].slice(0, 100)
    await writeQueue(nextQueue)
    return nextItem
  }

  const item = normalizeRetryItem({
    payload: normalizedPayload,
    createdAt: now,
    lastQueuedAt: now,
    lastError,
    duplicateCount: 1,
  })

  queue.unshift(item)
  await writeQueue(queue.slice(0, 100))
  return item
}

export async function updatePDAShellRetry(item: PDAIngestRetryItem) {
  const normalized = normalizeRetryItem(item)
  const queue = await readQueue()
  const next = queue.map((current) => (current.id === normalized.id ? normalized : current))
  await writeQueue(next)
}

export async function removePDAShellRetry(id: string) {
  const queue = await readQueue()
  await writeQueue(queue.filter((item) => item.id !== id))
}

export async function clearPDAShellRetryQueue(scene?: string) {
  if (!scene) {
    await writeQueue([])
    return
  }

  const normalizedScene = normalizeSceneKey(scene)
  const queue = await readQueue()
  await writeQueue(queue.filter((item) => item.scene !== normalizedScene))
}
