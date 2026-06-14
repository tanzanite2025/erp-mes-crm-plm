import { StorageService } from '@/features/system-mgmt/services/storage-service'
import {
  createDefaultHoleCodeSources,
  SHARED_HOLE_CODE_SOURCE_STORAGE_KEY,
  type HoleCodeCountDraft,
  type HoleCodeCountItem,
  type HoleCodePrefixDraft,
  type HoleCodePrefixItem,
  type HoleCodeSourceBundle,
} from '../data/hole-code-source'

function buildHoleCodeSourceId(kind: 'prefix' | 'count') {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `hole_${kind}_${Date.now()}`
}

function normalizeHolePrefix(value: string) {
  return value.trim().toUpperCase().slice(0, 1)
}

function normalizeHoles(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 2)
  return digits.padStart(2, '0')
}

function sortHoleCodePrefixes(items: HoleCodePrefixItem[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    if (left.code !== right.code) {
      return left.code.localeCompare(right.code)
    }

    return left.label.localeCompare(right.label)
  })
}

function sortHoleCodeCounts(items: HoleCodeCountItem[]) {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    if (left.value !== right.value) {
      return left.value.localeCompare(right.value)
    }

    return left.label.localeCompare(right.label)
  })
}

function sortHoleCodeSourceBundle(
  bundle: HoleCodeSourceBundle
): HoleCodeSourceBundle {
  return {
    prefixes: sortHoleCodePrefixes(bundle.prefixes),
    counts: sortHoleCodeCounts(bundle.counts),
  }
}

function getNextSortOrder<T extends { sortOrder: number }>(items: T[]) {
  if (items.length === 0) {
    return 1
  }

  return Math.max(...items.map((item) => item.sortOrder || 0)) + 1
}

function isHoleCodeSourceBundle(value: unknown): value is HoleCodeSourceBundle {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'prefixes' in value &&
    'counts' in value &&
    Array.isArray((value as HoleCodeSourceBundle).prefixes) &&
    Array.isArray((value as HoleCodeSourceBundle).counts)
  )
}

async function writeHoleCodeSources(bundle: HoleCodeSourceBundle) {
  const sorted = sortHoleCodeSourceBundle(bundle)
  await StorageService.setItem(SHARED_HOLE_CODE_SOURCE_STORAGE_KEY, sorted)
  return sorted
}

async function readHoleCodeSources() {
  const stored = await StorageService.getItem<unknown>(
    SHARED_HOLE_CODE_SOURCE_STORAGE_KEY
  )

  if (isHoleCodeSourceBundle(stored)) {
    return sortHoleCodeSourceBundle(stored)
  }

  const defaults = createDefaultHoleCodeSources()
  await writeHoleCodeSources(defaults)
  return defaults
}

function normalizePrefixDraft(
  draft: HoleCodePrefixDraft,
  current: HoleCodePrefixItem | undefined,
  nextSortOrder: number
): HoleCodePrefixItem {
  const code = normalizeHolePrefix(draft.code || current?.code || 'R') || 'R'
  const now = new Date().toISOString()
  const label = draft.label.trim() || code

  return {
    id: draft.id?.trim() || current?.id || buildHoleCodeSourceId('prefix'),
    code,
    label,
    description: draft.description?.trim() || '',
    active: draft.active,
    sortOrder: current?.sortOrder ?? nextSortOrder,
    createdAt: current?.createdAt || now,
    updatedAt: now,
    version: (current?.version || draft.version || 0) + 1,
  }
}

function normalizeCountDraft(
  draft: HoleCodeCountDraft,
  current: HoleCodeCountItem | undefined,
  nextSortOrder: number
): HoleCodeCountItem {
  const value = normalizeHoles(draft.value || current?.value || '14')
  const now = new Date().toISOString()
  const label = draft.label.trim() || value

  return {
    id: draft.id?.trim() || current?.id || buildHoleCodeSourceId('count'),
    value,
    label,
    description: draft.description?.trim() || '',
    active: draft.active,
    sortOrder: current?.sortOrder ?? nextSortOrder,
    createdAt: current?.createdAt || now,
    updatedAt: now,
    version: (current?.version || draft.version || 0) + 1,
  }
}

export const holeCodeSourceService = {
  async getHoleCodeSources(): Promise<HoleCodeSourceBundle> {
    return readHoleCodeSources()
  },

  async saveHoleCodePrefix(
    draft: HoleCodePrefixDraft
  ): Promise<HoleCodeSourceBundle> {
    const bundle = await readHoleCodeSources()
    const current = bundle.prefixes.find((item) => item.id === draft.id)
    const nextItem = normalizePrefixDraft(
      draft,
      current,
      getNextSortOrder(bundle.prefixes)
    )

    const duplicated = bundle.prefixes.find(
      (item) => item.id !== nextItem.id && item.code === nextItem.code
    )

    if (duplicated) {
      throw new Error('Duplicated hole code prefix')
    }

    const nextBundle: HoleCodeSourceBundle = {
      ...bundle,
      prefixes: current
        ? bundle.prefixes.map((item) =>
            item.id === nextItem.id ? nextItem : item
          )
        : [...bundle.prefixes, nextItem],
    }

    return writeHoleCodeSources(nextBundle)
  },

  async saveHoleCodeCount(
    draft: HoleCodeCountDraft
  ): Promise<HoleCodeSourceBundle> {
    const bundle = await readHoleCodeSources()
    const current = bundle.counts.find((item) => item.id === draft.id)
    const nextItem = normalizeCountDraft(
      draft,
      current,
      getNextSortOrder(bundle.counts)
    )

    const duplicated = bundle.counts.find(
      (item) => item.id !== nextItem.id && item.value === nextItem.value
    )

    if (duplicated) {
      throw new Error('Duplicated hole code count')
    }

    const nextBundle: HoleCodeSourceBundle = {
      ...bundle,
      counts: current
        ? bundle.counts.map((item) =>
            item.id === nextItem.id ? nextItem : item
          )
        : [...bundle.counts, nextItem],
    }

    return writeHoleCodeSources(nextBundle)
  },

  async deleteHoleCodePrefix(id: string): Promise<HoleCodeSourceBundle> {
    const bundle = await readHoleCodeSources()
    return writeHoleCodeSources({
      ...bundle,
      prefixes: bundle.prefixes.filter((item) => item.id !== id),
    })
  },

  async deleteHoleCodeCount(id: string): Promise<HoleCodeSourceBundle> {
    const bundle = await readHoleCodeSources()
    return writeHoleCodeSources({
      ...bundle,
      counts: bundle.counts.filter((item) => item.id !== id),
    })
  },
}
