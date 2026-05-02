import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_KNOWLEDGE_BASE_ENTRIES,
  EMPTY_KNOWLEDGE_BASE_ENTRY,
  matchesKnowledgeBaseEntry,
  type KnowledgeBaseCategory,
  type KnowledgeBaseEntry,
} from '../data/knowledge-base'
import { knowledgeBaseService } from '../services/knowledge-base-service'
import type { KnowledgeBaseDraft } from '../types'

export function useKnowledgeBase() {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>(DEFAULT_KNOWLEDGE_BASE_ENTRIES)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeBaseCategory | 'all'>('all')
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [draft, setDraft] = useState<KnowledgeBaseDraft>(EMPTY_KNOWLEDGE_BASE_ENTRY)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    knowledgeBaseService
      .getEntries()
      .then((nextEntries) => {
        if (!mounted) return
        setEntries(nextEntries)
        setErrorMessage(null)
      })
      .catch((error) => {
        if (!mounted) return
        setErrorMessage(error instanceof Error ? error.message : String(error))
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const filteredEntries = useMemo(
    () =>
      entries
        .filter((entry) => categoryFilter === 'all' || entry.category === categoryFilter)
        .filter((entry) => matchesKnowledgeBaseEntry(entry, searchTerm))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    [categoryFilter, entries, searchTerm]
  )

  const openCreate = () => {
    setEditingEntry(null)
    setDraft(EMPTY_KNOWLEDGE_BASE_ENTRY)
    setIsEditorOpen(true)
  }

  const openEdit = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry)
    setDraft({
      title: entry.title,
      category: entry.category,
      summary: entry.summary,
      content: entry.content,
      keywords: entry.keywords,
      routePath: entry.routePath,
      version: entry.version,
    })
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setEditingEntry(null)
    setDraft(EMPTY_KNOWLEDGE_BASE_ENTRY)
  }

  const saveDraft = async () => {
    const normalizedDraft: KnowledgeBaseDraft = {
      ...draft,
      title: draft.title.trim(),
      summary: draft.summary.trim(),
      content: draft.content.trim(),
      routePath: draft.routePath.trim(),
      keywords: draft.keywords.map((item) => item.trim()).filter(Boolean),
      version: draft.version,
    }

    if (!normalizedDraft.title || !normalizedDraft.summary || !normalizedDraft.content) {
      return false
    }

    setIsSaving(true)
    setErrorMessage(null)
    try {
      const savedEntry = editingEntry
        ? await knowledgeBaseService.updateEntry(editingEntry.id, normalizedDraft)
        : await knowledgeBaseService.createEntry(normalizedDraft)
      setEntries((currentEntries) =>
        editingEntry
          ? currentEntries.map((entry) =>
              entry.id === savedEntry.id ? savedEntry : entry
            )
          : [savedEntry, ...currentEntries]
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      return false
    } finally {
      setIsSaving(false)
    }

    closeEditor()
    return true
  }

  const deleteEntry = async (entryId: string) => {
    const previousEntries = entries
    setEntries((currentEntries) => currentEntries.filter((entry) => entry.id !== entryId))
    setErrorMessage(null)
    await knowledgeBaseService.deleteEntry(entryId).catch((error) => {
      setEntries(previousEntries)
      setErrorMessage(error instanceof Error ? error.message : String(error))
    })
  }

  return {
    entries,
    filteredEntries,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    editingEntry,
    draft,
    setDraft,
    isEditorOpen,
    setIsEditorOpen,
    isLoading,
    isSaving,
    errorMessage,
    openCreate,
    openEdit,
    closeEditor,
    saveDraft,
    deleteEntry,
  }
}
