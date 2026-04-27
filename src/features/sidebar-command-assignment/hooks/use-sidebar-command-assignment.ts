import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import type { UserOption } from '@/features/users/data/schema'
import { buildSidebarCommandAssignmentPreview } from '../data/assignment-preview'
import { toPresentedSidebarCommand } from '../data/command-presentation'
import {
  batchAssignSidebarCommands,
  copySidebarCommandAssignment,
  fetchAssignableSidebarCommands,
  fetchSidebarCommandCategories,
  fetchSidebarCommandUsers,
  fetchUserSidebarCommandAssignment,
  replaceUserSidebarCommandAssignment,
  type BatchSidebarCommandMode,
} from '../services'
import type { PresentedSidebarCommand, SidebarCommandAccount } from '../types'

function toSidebarCommandAccount(user: UserOption): SidebarCommandAccount {
  const displayName = `${user.lastName || ''}${user.firstName || ''}`.trim()

  return {
    id: user.id,
    username: user.username,
    name: displayName || user.username,
    accountLabel: user.employeeId || user.username,
    status: user.status || 'active',
  }
}

export function useSidebarCommandAssignmentViewModel() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [requestedAccountId, setRequestedAccountId] = useState('')
  const [draftCommandIdsByUser, setDraftCommandIdsByUser] = useState<
    Record<string, string[]>
  >({})
  const [draftCategoryIdsByUser, setDraftCategoryIdsByUser] = useState<
    Record<string, string[]>
  >({})
  const [targetUserIds, setTargetUserIds] = useState<string[]>([])
  const [batchMode, setBatchMode] = useState<BatchSidebarCommandMode>('replace')

  const usersQuery = useQuery({
    queryKey: ['quick-actions', 'sidebar', 'assignment-users'],
    queryFn: fetchSidebarCommandUsers,
  })

  const commandsQuery = useQuery({
    queryKey: ['quick-actions', 'sidebar', 'commands'],
    queryFn: fetchAssignableSidebarCommands,
  })

  const categoriesQuery = useQuery({
    queryKey: ['quick-actions', 'sidebar', 'categories'],
    queryFn: fetchSidebarCommandCategories,
  })

  const accounts = useMemo(() => {
    return (
      usersQuery.data?.map((user) => toSidebarCommandAccount(user)) ?? []
    )
  }, [usersQuery.data])

  const selectedAccountId = accounts.some(
    (account) => account.id === requestedAccountId
  )
    ? requestedAccountId
    : (accounts[0]?.id ?? '')

  const assignmentQuery = useQuery({
    queryKey: ['quick-actions', 'sidebar', 'users', selectedAccountId],
    queryFn: () => fetchUserSidebarCommandAssignment(selectedAccountId),
    enabled: Boolean(selectedAccountId),
  })

  const assignableCommands = useMemo<PresentedSidebarCommand[]>(() => {
    const commands =
      commandsQuery.data?.map((command) =>
        toPresentedSidebarCommand(
          command,
          t('sidebarCommandAssignment.fallback.commandDescription')
        )
      ) ?? []
    return commands.sort((left, right) => left.sortOrder - right.sortOrder)
  }, [commandsQuery.data, t])

  const assignableCategories = useMemo(() => {
    return [...(categoriesQuery.data ?? [])]
      .filter((category) => category.enabled && category.status !== 'disabled')
      .sort((left, right) => left.sortOrder - right.sortOrder)
  }, [categoriesQuery.data])

  const filteredAccounts = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return accounts

    return accounts.filter((account) =>
      [account.name, account.username, account.accountLabel]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    )
  }, [accounts, query])

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? accounts[0]
  const hasSelectedAccount = Boolean(selectedAccountId)
  const serverCommandIds = assignmentQuery.data?.commandIds ?? []
  const serverCategoryIds = assignmentQuery.data?.categoryIds ?? []
  const draftCommandIds =
    draftCommandIdsByUser[selectedAccountId] ?? serverCommandIds
  const draftCategoryIds =
    draftCategoryIdsByUser[selectedAccountId] ?? serverCategoryIds
  const selectedCodeSet = useMemo(
    () => new Set(draftCommandIds),
    [draftCommandIds]
  )
  const selectedCategorySet = useMemo(
    () => new Set(draftCategoryIds),
    [draftCategoryIds]
  )
  const effectivePreviewCommands = useMemo(() => {
    return buildSidebarCommandAssignmentPreview({
      commands: assignableCommands,
      categoryIds: draftCategoryIds,
      commandIds: draftCommandIds,
      categories: assignableCategories,
    })
  }, [
    assignableCategories,
    assignableCommands,
    draftCategoryIds,
    draftCommandIds,
  ])
  const directCommandCount = draftCommandIds.length
  const assignedCount = effectivePreviewCommands.length
  const assignedCategoryCount = draftCategoryIds.length
  const selectedTargetCount = targetUserIds.length

  const saveMutation = useMutation({
    mutationFn: () =>
      replaceUserSidebarCommandAssignment(
        selectedAccountId,
        draftCommandIds,
        draftCategoryIds
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ['quick-actions', 'sidebar', 'users', data.userId],
        data
      )
      setDraftCommandIdsByUser((current) => ({
        ...current,
        [data.userId]: data.commandIds,
      }))
      setDraftCategoryIdsByUser((current) => ({
        ...current,
        [data.userId]: data.categoryIds,
      }))
      queryClient.invalidateQueries({ queryKey: ['quick-actions', 'sidebar'] })
      toast.success(t('sidebarCommandAssignment.toast.assignmentSaveSuccess'))
    },
    onError: () =>
      toast.error(t('sidebarCommandAssignment.toast.assignmentSaveError')),
  })

  const batchMutation = useMutation({
    mutationFn: () =>
      batchAssignSidebarCommands(
        targetUserIds,
        draftCommandIds,
        batchMode,
        draftCategoryIds
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions', 'sidebar'] })
      toast.success(
        t('sidebarCommandAssignment.toast.batchSuccess', {
          count: data.updated,
        })
      )
    },
    onError: () => toast.error(t('sidebarCommandAssignment.toast.batchError')),
  })

  const copyMutation = useMutation({
    mutationFn: () =>
      copySidebarCommandAssignment(selectedAccountId, targetUserIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quick-actions', 'sidebar'] })
      toast.success(
        t('sidebarCommandAssignment.toast.copySuccess', {
          count: data.updated,
        })
      )
    },
    onError: () => toast.error(t('sidebarCommandAssignment.toast.copyError')),
  })

  const setCurrentDraftCommandIds = (
    next: string[] | ((current: string[]) => string[])
  ) => {
    setDraftCommandIdsByUser((current) => {
      const previous = current[selectedAccountId] ?? serverCommandIds
      const value = typeof next === 'function' ? next(previous) : next

      return {
        ...current,
        [selectedAccountId]: value,
      }
    })
  }

  const setCurrentDraftCategoryIds = (
    next: string[] | ((current: string[]) => string[])
  ) => {
    setDraftCategoryIdsByUser((current) => {
      const previous = current[selectedAccountId] ?? serverCategoryIds
      const value = typeof next === 'function' ? next(previous) : next

      return {
        ...current,
        [selectedAccountId]: value,
      }
    })
  }

  const toggleCommand = (code: string, checked: boolean) => {
    setCurrentDraftCommandIds((current) =>
      checked
        ? Array.from(new Set([...current, code]))
        : current.filter((item) => item !== code)
    )
  }

  const toggleCategory = (categoryId: string, checked: boolean) => {
    setCurrentDraftCategoryIds((current) =>
      checked
        ? Array.from(new Set([...current, categoryId]))
        : current.filter((item) => item !== categoryId)
    )
  }

  const selectAllCommands = () => {
    setCurrentDraftCommandIds(assignableCommands.map((command) => command.code))
  }

  const clearCommands = () => {
    setCurrentDraftCommandIds([])
    setCurrentDraftCategoryIds([])
  }

  const toggleTarget = (userId: string, checked: boolean) => {
    setTargetUserIds((current) =>
      checked
        ? Array.from(new Set([...current, userId]))
        : current.filter((item) => item !== userId)
    )
  }

  const selectFilteredTargets = () => {
    setTargetUserIds((current) =>
      Array.from(
        new Set([...current, ...filteredAccounts.map((account) => account.id)])
      )
    )
  }

  const clearTargets = () => {
    setTargetUserIds([])
  }

  return {
    query,
    setQuery,
    usersQuery,
    commandsQuery,
    categoriesQuery,
    assignmentQuery,
    accounts,
    filteredAccounts,
    selectedAccount,
    selectedAccountId,
    hasSelectedAccount,
    assignableCommands,
    assignableCategories,
    selectedCodeSet,
    selectedCategorySet,
    effectivePreviewCommands,
    directCommandCount,
    assignedCount,
    assignedCategoryCount,
    targetUserIds,
    selectedTargetCount,
    batchMode,
    setBatchMode,
    saveMutation,
    batchMutation,
    copyMutation,
    selectAccount: setRequestedAccountId,
    toggleCommand,
    toggleCategory,
    selectAllCommands,
    clearCommands,
    toggleTarget,
    selectFilteredTargets,
    clearTargets,
  }
}
