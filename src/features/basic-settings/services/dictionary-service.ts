import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'
import { DictionaryEntry, DictionaryGroup, DictionaryOption } from '../data/schema'

const logger = createLogger('DictionaryService')

class DictionaryService {
  private groups: DictionaryGroup[] = []
  private entries: DictionaryEntry[] = []
  private isInitialized = false
  private readyPromise: Promise<void> | null = null
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (this.isInitialized) return
    if (this.initPromise) return this.initPromise

    this.readyPromise = this.loadFromBackend()
    this.initPromise = this.readyPromise

    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  async waitUntilReady(): Promise<void> {
    if (this.isInitialized) return
    if (this.readyPromise) return this.readyPromise
    return this.init()
  }

  private async loadFromBackend(): Promise<void> {
    try {
      const [groups, entries] = await Promise.all([
        apiFetch<DictionaryGroup[]>('/dictionary/groups'),
        apiFetch<DictionaryEntry[]>('/dictionary/entries'),
      ])

      const normalizedGroups = ensureArrayResponse<DictionaryGroup>(groups, 'Dictionary groups')
      const normalizedEntries = ensureArrayResponse<DictionaryEntry>(entries, 'Dictionary entries')

      if (normalizedGroups.length === 0) {
        logger.warn('Cloud dictionary is empty. Please ensure seed data is initialized on backend.')
      }

      this.groups = normalizedGroups
      this.entries = normalizedEntries.map((entry) => {
        const rawOptions = entry.options
        let options = rawOptions

        if (typeof rawOptions === 'string') {
          try {
            options = JSON.parse(rawOptions)
          } catch {
            try {
              options = JSON.parse(atob(rawOptions))
            } catch {
              logger.error('Parse failed', entry.code)
              options = []
            }
          }
        }

        return { ...entry, options: Array.isArray(options) ? options : [] }
      })

      this.isInitialized = true
      window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
      logger.info(
        `Successfully initialized ${this.groups.length} groups and ${this.entries.length} entries.`
      )
    } catch (err) {
      logger.error('Init failed', err)
      throw err
    }
  }

  getLabel(groupCode: string, value: string | number): string {
    const targetGroup = this.groups.find((group) => group.code === groupCode)
    if (!targetGroup) return String(value || '')

    const entry = this.entries.find(
      (item) =>
        item.groupId === targetGroup.id &&
        (item.options as any[])?.some((option: any) =>
          (typeof option === 'string' ? option : option.value) === value,
        ),
    )

    if (entry) {
      const option = (entry.options as any[]).find(
        (item: any) => (typeof item === 'string' ? item : item.value) === value,
      )

      if (option) {
        return typeof option === 'string' ? option : option.label
      }
    }

    return String(value || '未定义')
  }

  getGroups(): DictionaryGroup[] {
    return this.groups
  }

  getEntries(groupId?: string): DictionaryEntry[] {
    if (groupId) {
      return this.entries.filter((entry) => entry.groupId === groupId)
    }

    return this.entries
  }

  getOptions(entryCode: string): DictionaryOption[] {
    const entry = this.entries.find((item) => item.code === entryCode)
    if (!entry) return []
    return (entry.options || []) as DictionaryOption[]
  }

  async updateEntry(entryCode: string, options: any[]) {
    const entry = this.entries.find((item) => item.code === entryCode)
    if (!entry) return

    const updatedEntry = { ...entry, options }

    try {
      await apiFetch('/dictionary/entries', {
        method: 'POST',
        body: JSON.stringify(updatedEntry),
      })
      const index = this.entries.findIndex((item) => item.code === entryCode)
      this.entries[index] = updatedEntry
      window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
    } catch (err) {
      logger.error('Update entry failed', err)
      throw err
    }
  }

  async saveGroups(groups: DictionaryGroup[]) {
    this.groups = groups
    for (const group of groups) {
      await apiFetch('/dictionary/groups', { method: 'POST', body: JSON.stringify(group) })
    }
    window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
  }

  async saveEntries(entries: DictionaryEntry[]) {
    this.entries = entries
    for (const entry of entries) {
      await apiFetch('/dictionary/entries', { method: 'POST', body: JSON.stringify(entry) })
    }
    window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
  }

  async syncSystemDictionary(): Promise<void> {
    try {
      await apiFetch('/dictionary/sync', { method: 'POST' })
      this.isInitialized = false
      await this.init()
      window.dispatchEvent(new CustomEvent('xdfc_dictionary_updated'))
    } catch (err) {
      logger.error('Sync failed', err)
      throw err
    }
  }
}

export const dictionaryService = new DictionaryService()
