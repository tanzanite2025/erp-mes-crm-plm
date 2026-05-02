import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayResponse,
  ensureObjectResponse,
} from '@/lib/api-response'
import {
  DEFAULT_KNOWLEDGE_BASE_ENTRIES,
  type KnowledgeBaseCategory,
  type KnowledgeBaseEntry,
} from '../data/knowledge-base'
import type { KnowledgeBaseDraft } from '../types'

const KNOWLEDGE_BASE_ENDPOINT = '/knowledge-base/entries'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isKnowledgeBaseCategory(value: unknown): value is KnowledgeBaseCategory {
  return (
    value === 'workflow' ||
    value === 'status' ||
    value === 'operation' ||
    value === 'exception' ||
    value === 'terminology'
  )
}

export function normalizeKnowledgeBaseEntry(value: unknown): KnowledgeBaseEntry | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    !isKnowledgeBaseCategory(value.category) ||
    typeof value.summary !== 'string' ||
    typeof value.content !== 'string' ||
    typeof value.routePath !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !Array.isArray(value.keywords)
  ) {
    return null
  }

  return {
    id: value.id,
    title: value.title,
    category: value.category,
    summary: value.summary,
    content: value.content,
    contentText: typeof value.contentText === 'string' ? value.contentText : undefined,
    routePath: value.routePath,
    hasImage: typeof value.hasImage === 'boolean' ? value.hasImage : undefined,
    hasVideo: typeof value.hasVideo === 'boolean' ? value.hasVideo : undefined,
    viewCount: typeof value.viewCount === 'number' ? value.viewCount : undefined,
    lastViewedAt: typeof value.lastViewedAt === 'string' ? value.lastViewedAt : undefined,
    version: typeof value.version === 'number' ? value.version : undefined,
    createdBy: typeof value.createdBy === 'string' ? value.createdBy : undefined,
    updatedBy: typeof value.updatedBy === 'string' ? value.updatedBy : undefined,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : undefined,
    updatedAt: value.updatedAt,
    keywords: value.keywords.filter((item): item is string => typeof item === 'string'),
  }
}

export function parseKnowledgeBaseEntries(value: unknown): KnowledgeBaseEntry[] {
  let rawEntries: unknown
  try {
    rawEntries = typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return DEFAULT_KNOWLEDGE_BASE_ENTRIES
  }
  if (!Array.isArray(rawEntries)) return DEFAULT_KNOWLEDGE_BASE_ENTRIES

  const entries = ensureArrayResponse<unknown>(
    rawEntries,
    'KnowledgeBaseService.parseKnowledgeBaseEntries'
  )
    .map(normalizeKnowledgeBaseEntry)
    .filter((entry): entry is KnowledgeBaseEntry => Boolean(entry))
  return entries.length > 0 ? entries : DEFAULT_KNOWLEDGE_BASE_ENTRIES
}

function parseKnowledgeBaseEntry(value: unknown): KnowledgeBaseEntry {
  const objectValue = ensureObjectResponse<Record<string, unknown>>(
    value,
    'KnowledgeBaseService.parseKnowledgeBaseEntry'
  )
  const entry = normalizeKnowledgeBaseEntry(objectValue)
  if (!entry) {
    throw new Error('[INVALID_RESPONSE] KnowledgeBaseService expected a knowledge entry.')
  }
  return entry
}

function toKnowledgeBasePayload(draft: KnowledgeBaseDraft, id?: string) {
  return {
    ...(id ? { id } : {}),
    title: draft.title,
    category: draft.category,
    summary: draft.summary,
    content: draft.content,
    keywords: draft.keywords,
    routePath: draft.routePath,
    version: draft.version,
  }
}

export const knowledgeBaseService = {
  async getEntries(): Promise<KnowledgeBaseEntry[]> {
    const res = await apiFetch<unknown>(KNOWLEDGE_BASE_ENDPOINT)
    return parseKnowledgeBaseEntries(res)
  },

  async searchEntries(query: string): Promise<KnowledgeBaseEntry[]> {
    const normalizedQuery = query.trim()
    const endpoint = normalizedQuery
      ? `${KNOWLEDGE_BASE_ENDPOINT}/search?q=${encodeURIComponent(normalizedQuery)}`
      : KNOWLEDGE_BASE_ENDPOINT
    const res = await apiFetch<unknown>(endpoint)
    return parseKnowledgeBaseEntries(res)
  },

  async createEntry(draft: KnowledgeBaseDraft): Promise<KnowledgeBaseEntry> {
    const res = await apiFetch<unknown>(KNOWLEDGE_BASE_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toKnowledgeBasePayload(draft)),
    })
    return parseKnowledgeBaseEntry(res)
  },

  async updateEntry(id: string, draft: KnowledgeBaseDraft): Promise<KnowledgeBaseEntry> {
    const res = await apiFetch<unknown>(`${KNOWLEDGE_BASE_ENDPOINT}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(toKnowledgeBasePayload(draft, id)),
    })
    return parseKnowledgeBaseEntry(res)
  },

  async deleteEntry(id: string): Promise<void> {
    await apiFetch<void>(`${KNOWLEDGE_BASE_ENDPOINT}/${id}`, {
      method: 'DELETE',
    })
  },

  async recordView(id: string): Promise<void> {
    await apiFetch<void>(`${KNOWLEDGE_BASE_ENDPOINT}/${id}/view`, {
      method: 'POST',
    })
  },
}
