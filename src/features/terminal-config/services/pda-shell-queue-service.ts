import type { PDAIngestRequest } from './pda-ingest-service'
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

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
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

function readQueue(): PDAIngestRetryItem[] {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(PDA_SHELL_QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => {
        if (!item) throw new Error("[CRITICAL] PDA Queue Item is null during normalization");
        return normalizeRetryItem(item)
    })
  } catch (error) {
    logger.error('Failed to read retry queue', error)
    return []
  }
}

function writeQueue(queue: PDAIngestRetryItem[]) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(PDA_SHELL_QUEUE_KEY, JSON.stringify(queue))
  } catch (error) {
    logger.error('Failed to write retry queue', error)
  }
}

export function listPDAShellRetryQueue(scene?: string): PDAIngestRetryItem[] {
  const queue = readQueue()
  if (!scene) return queue
  const normalizedScene = normalizeSceneKey(scene)
  return queue.filter((item) => item.scene === normalizedScene)
}

export function listPDAShellRetryQueueByScene(): PDAIngestRetrySceneGroup[] {
  const sceneMap = new Map<string, PDAIngestRetrySceneGroup>()

  for (const item of readQueue()) {
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

export function enqueuePDAShellRetry(
  payload: PDAIngestRequest,
  lastError?: string
): PDAIngestRetryItem {
  const queue = readQueue()
  const normalizedPayload: PDAIngestRequest = {
    ...payload,
    scene: normalizeScene(payload.scene),
    rawCode: (payload.rawCode || '').trim().toUpperCase(),
    deviceId: (payload.deviceId || '').trim().toUpperCase(),
    materialCode: (payload.materialCode || '').trim().toUpperCase(),
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
    writeQueue(nextQueue)
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
  writeQueue(queue.slice(0, 100))
  return item
}

export function updatePDAShellRetry(item: PDAIngestRetryItem) {
  const normalized = normalizeRetryItem(item)
  const queue = readQueue()
  const next = queue.map((current) => (current.id === normalized.id ? normalized : current))
  writeQueue(next)
}

export function removePDAShellRetry(id: string) {
  const queue = readQueue()
  writeQueue(queue.filter((item) => item.id !== id))
}

export function clearPDAShellRetryQueue(scene?: string) {
  if (!scene) {
    writeQueue([])
    return
  }

  const normalizedScene = normalizeScene(scene)
  const queue = readQueue()
  writeQueue(queue.filter((item) => item.scene !== normalizedScene))
}
