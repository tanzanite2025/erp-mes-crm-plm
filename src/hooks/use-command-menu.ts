import React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Box } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
import { hasAllIds } from '@/features/authz/core/permission-kernel'
import {
  EMPTY_KNOWLEDGE_BASE_ENTRY,
  matchesKnowledgeBaseEntry,
} from '@/features/basic-settings/knowledge-base/data/knowledge-base'
import { knowledgeBaseService } from '@/features/basic-settings/knowledge-base/services/knowledge-base-service'
import { type KnowledgeBaseDraft } from '@/features/basic-settings/knowledge-base/types'
import { apiFetch } from '@/lib/api-client'
import { getSearchItems, type SearchItem } from '@/components/layout/data/search-data'
import {
  getQuickActionDefinition,
  isHostedQuickActionId,
  type HostedQuickActionId,
} from '@/components/layout/data/quick-action-registry'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { useCommandMenuKnowledge } from './use-command-menu-knowledge'

const logger = createLogger('useCommandMenu')
const EMPTY_PERMISSION_IDS: string[] = []

type GlobalSearchApiItem = {
  id: string
  title: string
  href: string
  parentTitle: string
  code: string
}

type GlobalSearchApiResponse = {
  data?: GlobalSearchApiItem[]
}

export function normalizeSearchHref(href: string) {
  if (href === '/system-management/routing') {
    return '/approval/routing'
  }
  return href
}

function commandItemMatches(item: SearchItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  if (normalizedQuery === '') return true

  return [
    item.title,
    item.parentTitle,
    item.href,
    item.pinyin,
    ...(item.keywords ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

export function useCommandMenu() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const [searchValue, setSearchValue] = React.useState('')
  const [asyncResults, setAsyncResults] = React.useState<SearchItem[]>([])
  const [isSearching, setIsSearching] = React.useState(false)
  const [debouncedValue, setDebouncedValue] = React.useState('')
  const [activeQuickActionId, setActiveQuickActionId] = React.useState<HostedQuickActionId | null>(null)
  const [isKnowledgeCreateOpen, setIsKnowledgeCreateOpen] = React.useState(false)
  const [knowledgeCreateDraft, setKnowledgeCreateDraft] = React.useState<KnowledgeBaseDraft>(
    EMPTY_KNOWLEDGE_BASE_ENTRY
  )
  const [isKnowledgeCreateSaving, setIsKnowledgeCreateSaving] = React.useState(false)
  const userPermissionIds = useAuthStore(
    (state) => state.user?.permissions ?? EMPTY_PERMISSION_IDS
  )

  const searchItems = React.useMemo(() => getSearchItems(t), [t])

  const {
    knowledgeEntries,
    refreshKnowledgeEntries,
    selectedKnowledgeEntry,
    setSelectedKnowledgeEntry,
  } = useCommandMenuKnowledge(open, searchValue)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(searchValue)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue])

  React.useEffect(() => {
    if (!open) {
      setActiveQuickActionId(null)
      setIsKnowledgeCreateOpen(false)
      setKnowledgeCreateDraft(EMPTY_KNOWLEDGE_BASE_ENTRY)
      setIsKnowledgeCreateSaving(false)
    }
  }, [open])

  React.useEffect(() => {
    if (debouncedValue.length < 2) {
      setAsyncResults([])
      setIsSearching(false)
      return
    }

    const fetchResults = async () => {
      setIsSearching(true)
      try {
        const res = await apiFetch<GlobalSearchApiResponse>(
          `/search/global?q=${debouncedValue}`
        )

        const results: SearchItem[] = []

        if (res?.data) {
          res.data.forEach((item) => {
            results.push({
              id: `rust-search-${item.id}`,
              title: item.title,
              href: normalizeSearchHref(item.href),
              category: 'data',
              icon: Box,
              parentTitle: item.parentTitle + ` (${item.code})`,
              keywords: [
                item.title,
                item.code,
                'search',
              ],
            })
          })
        }

        setAsyncResults(results)
      } catch (error) {
        logger.error('Global search (Rust-backed) failed', error)
      } finally {
        setIsSearching(false)
      }
    }

    fetchResults()
  }, [debouncedValue, t])

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const isVisibleActionItem = React.useCallback(
    (item: SearchItem) => {
      if (item.category !== 'actions') return true
      if (item.id === 'action-create-knowledge-entry') return false

      const actionDefinition = getQuickActionDefinition(item.id)
      const requiredPermissions = actionDefinition?.requiredPermissions ?? []
      if (requiredPermissions.length === 0) return true

      return hasAllIds(userPermissionIds, requiredPermissions)
    },
    [userPermissionIds]
  )

  const groupedItems = React.useMemo(() => {
    return searchItems
      .filter((item) => isVisibleActionItem(item) && commandItemMatches(item, searchValue))
      .reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
      }, {} as Record<string, SearchItem[]>)
  }, [isVisibleActionItem, searchItems, searchValue])

  const handleNavigate = React.useCallback(
    (href: string) => {
      runCommand(() => navigate({ to: href }))
    },
    [navigate, runCommand]
  )

  const handleQuickActionSelect = React.useCallback(
    (actionId: string) => {
      const actionDefinition = getQuickActionDefinition(actionId)
      if (!actionDefinition) return

      if (isHostedQuickActionId(actionDefinition.id)) {
        setActiveQuickActionId(actionDefinition.id)
        return
      }

      handleNavigate(actionDefinition.href)
    },
    [handleNavigate]
  )

  const handleItemSelect = React.useCallback(
    (item: SearchItem) => {
      if (isHostedQuickActionId(item.id)) {
        setActiveQuickActionId(item.id)
        return
      }

      handleNavigate(item.href)
    },
    [handleNavigate]
  )

  const handleSearchReset = React.useCallback(() => {
    setSearchValue('')
  }, [])

  const handleKnowledgeCreateClose = React.useCallback(() => {
    if (isKnowledgeCreateSaving) return

    setIsKnowledgeCreateOpen(false)
    setKnowledgeCreateDraft(EMPTY_KNOWLEDGE_BASE_ENTRY)
  }, [isKnowledgeCreateSaving])

  const handleKnowledgeCreate = React.useCallback(() => {
    setSelectedKnowledgeEntry(null)
    setKnowledgeCreateDraft(EMPTY_KNOWLEDGE_BASE_ENTRY)
    setIsKnowledgeCreateOpen(true)
  }, [setSelectedKnowledgeEntry])

  const handleKnowledgeCreateSave = React.useCallback(async () => {
    const normalizedDraft: KnowledgeBaseDraft = {
      ...knowledgeCreateDraft,
      title: knowledgeCreateDraft.title.trim(),
      summary: knowledgeCreateDraft.summary.trim(),
      content: knowledgeCreateDraft.content.trim(),
      routePath: knowledgeCreateDraft.routePath.trim(),
      keywords: knowledgeCreateDraft.keywords.map((item) => item.trim()).filter(Boolean),
      version: knowledgeCreateDraft.version,
    }

    if (!normalizedDraft.title || !normalizedDraft.summary || !normalizedDraft.content) {
      toast.error('请先补全标题、摘要和正文')
      return
    }

    setIsKnowledgeCreateSaving(true)
    try {
      const savedEntry = await knowledgeBaseService.createEntry(normalizedDraft)
      const nextEntries = await refreshKnowledgeEntries(searchValue)
      const isVisibleInCurrentResults = nextEntries.some((entry) => entry.id === savedEntry.id)
      const matchesCurrentSearch = matchesKnowledgeBaseEntry(savedEntry, searchValue)

      setIsKnowledgeCreateOpen(false)
      setKnowledgeCreateDraft(EMPTY_KNOWLEDGE_BASE_ENTRY)

      if (isVisibleInCurrentResults) {
        toast.success('知识条目已创建，搜索结果已刷新')
        return
      }

      if (matchesCurrentSearch) {
        toast.success('知识条目已创建，结果刷新可能稍后显示')
        return
      }

      toast.success('知识条目已创建，但当前搜索条件下未显示')
    } catch (error) {
      logger.error('Create knowledge entry from command menu failed', error)
      toast.error(error instanceof Error ? error.message : '知识条目创建失败')
    } finally {
      setIsKnowledgeCreateSaving(false)
    }
  }, [knowledgeCreateDraft, refreshKnowledgeEntries, searchValue])

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    runCommand(() => setTheme(theme))
  }

  const canCreateKnowledgeEntry = React.useMemo(() => {
    const knowledgeCreateAction = getQuickActionDefinition('action-create-knowledge-entry')
    const requiredPermissions = knowledgeCreateAction?.requiredPermissions ?? []
    if (requiredPermissions.length === 0) return true

    return hasAllIds(userPermissionIds, requiredPermissions)
  }, [userPermissionIds])

  return {
    open,
    setOpen,
    searchValue,
    setSearchValue,
    asyncResults,
    isKnowledgeCreateOpen,
    isKnowledgeCreateSaving,
    knowledgeEntries,
    knowledgeCreateDraft,
    selectedKnowledgeEntry,
    setKnowledgeCreateDraft,
    setSelectedKnowledgeEntry,
    isSearching,
    groupedItems,
    handleItemSelect,
    handleKnowledgeCreate,
    handleKnowledgeCreateClose,
    handleKnowledgeCreateSave,
    handleQuickActionSelect,
    handleSearchReset,
    handleThemeChange,
    activeQuickActionId,
    setActiveQuickActionId,
    canCreateKnowledgeEntry,
  }
}
