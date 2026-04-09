import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { DictionaryCoreService } from './dictionary-core-service'
import { type DictionaryEntry, type DictionaryGroup, type DictionaryOption } from '../data/schema'

const logger = createLogger('DictionaryMaintenanceService')

interface CreateGroupPayload {
    name: string
    code: string
    description?: string
    active?: boolean
}

interface PatchGroupPayload {
    name?: string
    description?: string
    active?: boolean
    version: string
}

interface CreateEntryPayload {
    groupId: string
    label: string
    code: string
    description?: string
    options?: DictionaryOption[]
    sortOrder?: number
    active?: boolean
}

interface PatchEntryPayload {
    label?: string
    description?: string
    options?: DictionaryOption[]
    sortOrder?: number
    active?: boolean
    version: string
}

const normalizeCode = (code: string) => code.trim().toUpperCase()

async function refreshDictionarySnapshot() {
    await DictionaryCoreService.refresh()
}

export const DictionaryMaintenanceService = {
    async createGroup(payload: CreateGroupPayload): Promise<DictionaryGroup> {
        const created = await apiFetch<DictionaryGroup>('/dictionary/groups', {
            method: 'POST',
            body: JSON.stringify({
                name: payload.name.trim(),
                code: normalizeCode(payload.code),
                description: payload.description ?? '',
                active: payload.active ?? true,
            }),
        })
        await refreshDictionarySnapshot()
        return created
    },

    async patchGroup(groupCode: string, payload: PatchGroupPayload): Promise<DictionaryGroup> {
        const updated = await apiFetch<DictionaryGroup>(`/dictionary/groups/${encodeURIComponent(normalizeCode(groupCode))}`, {
            method: 'PATCH',
            body: JSON.stringify({
                name: payload.name,
                description: payload.description,
                active: payload.active,
                version: payload.version,
            }),
        })
        await refreshDictionarySnapshot()
        return updated
    },

    async deleteGroup(groupCode: string): Promise<void> {
        await apiFetch(`/dictionary/groups/${encodeURIComponent(normalizeCode(groupCode))}`, {
            method: 'DELETE',
        })
        await refreshDictionarySnapshot()
    },

    async createEntry(payload: CreateEntryPayload): Promise<DictionaryEntry> {
        const created = await apiFetch<DictionaryEntry>('/dictionary/entries', {
            method: 'POST',
            body: JSON.stringify({
                groupId: payload.groupId,
                label: payload.label.trim(),
                code: normalizeCode(payload.code),
                description: payload.description ?? '',
                options: payload.options ?? [],
                sortOrder: payload.sortOrder ?? 0,
                active: payload.active ?? true,
            }),
        })
        await refreshDictionarySnapshot()
        return created
    },

    async patchEntry(entryCode: string, payload: PatchEntryPayload): Promise<DictionaryEntry> {
        const updated = await apiFetch<DictionaryEntry>(`/dictionary/entries/${encodeURIComponent(normalizeCode(entryCode))}`, {
            method: 'PATCH',
            body: JSON.stringify({
                label: payload.label,
                description: payload.description,
                options: payload.options,
                sortOrder: payload.sortOrder,
                active: payload.active,
                version: payload.version,
            }),
        })
        await refreshDictionarySnapshot()
        return updated
    },

    async deleteEntry(entryCode: string): Promise<void> {
        await apiFetch(`/dictionary/entries/${encodeURIComponent(normalizeCode(entryCode))}`, {
            method: 'DELETE',
        })
        await refreshDictionarySnapshot()
    },

    async syncSystemDictionary(): Promise<void> {
        try {
            await apiFetch('/dictionary/sync', { method: 'POST' })
            await refreshDictionarySnapshot()
        } catch (err) {
            logger.error('System sync failed', err)
            throw err
        }
    },
}
