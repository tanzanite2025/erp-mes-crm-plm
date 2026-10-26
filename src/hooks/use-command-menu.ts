import React from 'react'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Box } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { isApiClientError } from '@/lib/api-error'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { useSearch } from '@/context/search-provider'
import { type Theme, useTheme } from '@/context/theme-provider'
import { matchesGlobalSearchItemKeywords } from '@/components/layout/data/global-search-keyword-matching'
import {
  getQuickActionDefinition,
  isHostedQuickActionId,
  type HostedQuickActionId,
} from '@/components/layout/data/quick-action-registry'
import {
  getSearchItems,
  type SearchItem,
} from '@/components/layout/data/search-data'
import { normalizeSearchHref } from '@/components/layout/data/search-href'
import { hasAllIds } from '@/features/authz/core/permission-kernel'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import {
  EMPTY_KNOWLEDGE_BASE_ENTRY,
  matchesKnowledgeBaseEntry,
} from '@/features/basic-settings/knowledge-base/data/knowledge-base'
import { knowledgeBaseService } from '@/features/basic-settings/knowledge-base/services/knowledge-base-service'
import { type KnowledgeBaseDraft } from '@/features/basic-settings/knowledge-base/types'
import {
  fetchGlobalBusinessRecordSearchPage,
  type GlobalBusinessSearchPageCursor,
} from '@/features/global-search/services/global-business-record-search-api'
import { useCommandMenuKnowledge } from './use-command-menu-knowledge'

const logger = createLogger('useCommandMenu')
const EMPTY_PERMISSION_IDS: string[] = []

export function useCommandMenu() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const { setTheme } = useTheme()
  const { open, setOpen } = useSearch()
  const [searchValue, setSearchValue] = React.useState('')
  const [debouncedValue, setDebouncedValue] = React.useState('')
  const [activeQuickActionId, setActiveQuickActionId] =
    React.useState<HostedQuickActionId | null>(null)
  const [isKnowledgeCreateOpen, setIsKnowledgeCreateOpen] =
    React.useState(false)
  const [knowledgeCreateDraft, setKnowledgeCreateDraft] =
    React.useState<KnowledgeBaseDraft>(EMPTY_KNOWLEDGE_BASE_ENTRY)
  const [isKnowledgeCreateSaving, setIsKnowledgeCreateSaving] =
    React.useState(false)
  const user = useAuthStore((state) => state.user)
  const userPermissionIds = user?.permissions ?? EMPTY_PERMISSION_IDS

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

  const normalizedSearchValue = searchValue.trim()
  const isSearchDebouncing = normalizedSearchValue !== debouncedValue.trim()
  const hasAttemptedAutomaticSnapshotRestart = React.useRef(false)
  const businessSearchQueryKey = React.useMemo(
    () => [
      'global-business-search',
      user?.id,
      userPermissionIds,
      normalizedSearchValue,
    ],
    [user?.id, userPermissionIds, normalizedSearchValue]
  )
  const businessSearchQuery = useInfiniteQuery({
    queryKey: businessSearchQueryKey,
    queryFn: ({ pageParam, signal }) =>
      fetchGlobalBusinessRecordSearchPage(
        normalizedSearchValue,
        pageParam,
        signal
      ),
    initialPageParam: { offset: 0 } as GlobalBusinessSearchPageCursor,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore
        ? { offset: lastPage.nextOffset, generation: lastPage.generation }
        : undefined,
    enabled: open && normalizedSearchValue.length > 0 && !isSearchDebouncing,
    retry: false,
  })
  React.useEffect(() => {
    hasAttemptedAutomaticSnapshotRestart.current = false
  }, [businessSearchQueryKey])
  React.useEffect(() => {
    if (!open) {
      void queryClient.cancelQueries({
        queryKey: businessSearchQueryKey,
        exact: true,
      })
    }
  }, [open, businessSearchQueryKey, queryClient])
  React.useEffect(() => {
    if (businessSearchQuery.isSuccess) {
      hasAttemptedAutomaticSnapshotRestart.current = false
    }
    if (
      isApiClientError(businessSearchQuery.error) &&
      businessSearchQuery.error.code === 'GLOBAL_SEARCH_SNAPSHOT_CHANGED' &&
      !hasAttemptedAutomaticSnapshotRestart.current
    ) {
      hasAttemptedAutomaticSnapshotRestart.current = true
      // Replace all pages together after business data changes; never append
      // offsets from a different ranking snapshot to the visible results.
      void queryClient.resetQueries({
        queryKey: businessSearchQueryKey,
        exact: true,
      })
    }
  }, [
    businessSearchQuery.error,
    businessSearchQuery.isSuccess,
    businessSearchQueryKey,
    queryClient,
  ])
  const isSearching =
    normalizedSearchValue.length > 0 &&
    (isSearchDebouncing || businessSearchQuery.isFetching)
  const searchError = !isSearchDebouncing && businessSearchQuery.isError
  const asyncResults: SearchItem[] =
    normalizedSearchValue && !isSearchDebouncing
      ? (
          businessSearchQuery.data?.pages.flatMap((page) => page.data) ?? []
        ).map((item) => ({
          id: `business-search-${item.category}-${item.id}`,
          title: item.title,
          href: normalizeSearchHref(item.href),
          category: 'data',
          icon: Box,
          parentTitle: item.parentTitle + (item.code ? ` (${item.code})` : ''),
          keywords: [item.title, item.code],
        }))
      : []

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const isVisibleActionItem = React.useCallback(
    (item: SearchItem) => {
      if (item.category !== 'actions') {
        return matchesPathPermissionProjection(user, item.href.split('?')[0])
      }
      if (item.id === 'action-create-knowledge-entry') return false

      const actionDefinition = getQuickActionDefinition(item.id)
      const requiredPermissions = actionDefinition?.requiredPermissions ?? []
      if (requiredPermissions.length === 0) return true

      return hasAllIds(userPermissionIds, requiredPermissions)
    },
    [user, userPermissionIds]
  )

  const groupedItems = React.useMemo(() => {
    return searchItems
      .filter(
        (item) =>
          isVisibleActionItem(item) &&
          matchesGlobalSearchItemKeywords(item, searchValue)
      )
      .reduce(
        (acc, item) => {
          if (!acc[item.category]) acc[item.category] = []
          acc[item.category].push(item)
          return acc
        },
        {} as Record<string, SearchItem[]>
      )
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
      keywords: knowledgeCreateDraft.keywords
        .map((item) => item.trim())
        .filter(Boolean),
      version: knowledgeCreateDraft.version,
    }

    if (
      !normalizedDraft.title ||
      !normalizedDraft.summary ||
      !normalizedDraft.content
    ) {
      toast.error('请先补全标题、摘要和正文')
      return
    }

    setIsKnowledgeCreateSaving(true)
    try {
      const savedEntry = await knowledgeBaseService.createEntry(normalizedDraft)
      const nextEntries = await refreshKnowledgeEntries(searchValue)
      const isVisibleInCurrentResults = nextEntries.some(
        (entry) => entry.id === savedEntry.id
      )
      const matchesCurrentSearch = matchesKnowledgeBaseEntry(
        savedEntry,
        searchValue
      )

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

  const handleThemeChange = (theme: Theme) => {
    runCommand(() => setTheme(theme))
  }

  const canCreateKnowledgeEntry = React.useMemo(() => {
    const knowledgeCreateAction = getQuickActionDefinition(
      'action-create-knowledge-entry'
    )
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
    searchError,
    businessSearchCandidateLimitReached:
      !isSearchDebouncing &&
      (businessSearchQuery.data?.pages.some(
        (page) => page.candidateLimitReached
      ) ??
        false),
    hasMoreBusinessResults:
      !isSearchDebouncing && businessSearchQuery.hasNextPage,
    loadMoreBusinessResults: () => businessSearchQuery.fetchNextPage(),
    retryBusinessSearch: () =>
      queryClient.resetQueries({
        queryKey: businessSearchQueryKey,
        exact: true,
      }),
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
