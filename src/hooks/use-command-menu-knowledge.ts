import React from 'react'
import { createLogger } from '@/lib/logger'
import type { KnowledgeBaseEntry } from '@/features/basic-settings/knowledge-base/data/knowledge-base'
import { knowledgeBaseService } from '@/features/basic-settings/knowledge-base/services/knowledge-base-service'

const logger = createLogger('useCommandMenuKnowledge')

export function useCommandMenuKnowledge(open: boolean, searchValue: string) {
  const [entries, setEntries] = React.useState<KnowledgeBaseEntry[]>([])
  const [selectedEntry, setSelectedEntry] =
    React.useState<KnowledgeBaseEntry | null>(null)
  const [debouncedSearchValue, setDebouncedSearchValue] = React.useState('')
  const requestSeqRef = React.useRef(0)

  const loadKnowledgeEntries = React.useCallback(async (query: string) => {
    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq

    try {
      const nextEntries = await knowledgeBaseService.searchEntries(query)
      if (requestSeqRef.current !== requestSeq) {
        return nextEntries
      }

      setEntries(nextEntries)
      return nextEntries
    } catch (error) {
      if (requestSeqRef.current === requestSeq) {
        logger.error('Knowledge base search index load failed', error)
        setEntries([])
      }
      throw error
    }
  }, [])

  React.useEffect(() => {
    if (!open) {
      setDebouncedSearchValue('')
      return
    }
    const timer = window.setTimeout(() => {
      setDebouncedSearchValue(searchValue)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [open, searchValue])

  React.useEffect(() => {
    if (!open) return
    void loadKnowledgeEntries(debouncedSearchValue).catch(() => undefined)
  }, [debouncedSearchValue, loadKnowledgeEntries, open])

  React.useEffect(() => {
    if (!open) setSelectedEntry(null)
  }, [open])

  const refreshKnowledgeEntries = React.useCallback(
    async (query: string) => {
      if (!open) return entries
      return loadKnowledgeEntries(query)
    },
    [entries, loadKnowledgeEntries, open]
  )

  const selectKnowledgeEntry = React.useCallback(
    (entry: KnowledgeBaseEntry | null) => {
      setSelectedEntry(entry)
      if (!entry) return

      setEntries((currentEntries) =>
        currentEntries.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                viewCount: (item.viewCount ?? 0) + 1,
                lastViewedAt: new Date().toISOString(),
              }
            : item
        )
      )
      knowledgeBaseService.recordView(entry.id).catch((error) => {
        logger.warn('Failed to record knowledge entry view', error)
      })
    },
    []
  )

  return {
    knowledgeEntries: entries,
    refreshKnowledgeEntries,
    selectedKnowledgeEntry: selectedEntry,
    setSelectedKnowledgeEntry: selectKnowledgeEntry,
  }
}
