import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import {
  createSidebarCommandCategory,
  createSidebarCommandDefinition,
  fetchSidebarCommandCategories,
  fetchSidebarCommandLibrary,
  reorderSidebarCommandDefinitions,
  setSidebarCommandCategoryEnabled,
  setSidebarCommandDefinitionEnabled,
  updateSidebarCommandCategory,
  updateSidebarCommandDefinition,
} from '../api/library-api'
import type {
  SaveSidebarCommandCategoryPayload,
  SaveSidebarCommandDefinitionPayload,
  SidebarCommandCategoryDto,
  SidebarCommandDefinitionDto,
} from '../api/shared'
import { sidebarCommandMatchesSearch } from '../data/command-presentation'

export function useSidebarCommandLibraryViewModel() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [editingCommand, setEditingCommand] =
    useState<SidebarCommandDefinitionDto | null>(null)
  const [editingCategory, setEditingCategory] =
    useState<SidebarCommandCategoryDto | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false)
  const [formRevision, setFormRevision] = useState(0)
  const [categoryFormRevision, setCategoryFormRevision] = useState(0)

  const commandsQuery = useQuery({
    queryKey: ['quick-actions', 'sidebar', 'library'],
    queryFn: fetchSidebarCommandLibrary,
  })

  const categoriesQuery = useQuery({
    queryKey: ['quick-actions', 'sidebar', 'categories'],
    queryFn: fetchSidebarCommandCategories,
  })

  const commands = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return [...(commandsQuery.data ?? [])]
      .filter((command) => sidebarCommandMatchesSearch(command, keyword))
      .sort((left, right) => left.sortOrder - right.sortOrder)
  }, [commandsQuery.data, query])

  const sourceCommands = commandsQuery.data ?? []
  const categories = useMemo(() => {
    const keyword = query.trim().toLowerCase()

    return [...(categoriesQuery.data ?? [])]
      .filter((category) => {
        if (!keyword) return true
        return [
          category.categoryId,
          category.name,
          category.description,
          category.status,
        ]
          .join(' ')
          .toLowerCase()
          .includes(keyword)
      })
      .sort((left, right) => left.sortOrder - right.sortOrder)
  }, [categoriesQuery.data, query])
  const sourceCategories = categoriesQuery.data ?? []
  const enabledCount = sourceCommands.filter(
    (command) => command.enabled
  ).length
  const assignableCount = sourceCommands.filter(
    (command) => command.assignable
  ).length
  const enabledCategoryCount = sourceCategories.filter(
    (category) => category.enabled && category.status !== 'disabled'
  ).length

  const invalidateSidebarCommandQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['quick-actions', 'sidebar'] })
  }

  const createMutation = useMutation({
    mutationFn: createSidebarCommandDefinition,
    onSuccess: () => {
      invalidateSidebarCommandQueries()
      setIsFormOpen(false)
      setEditingCommand(null)
      toast.success(t('sidebarCommandAssignment.toast.createSuccess'))
    },
    onError: () => toast.error(t('sidebarCommandAssignment.toast.createError')),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      commandId,
      payload,
    }: {
      commandId: string
      payload: SaveSidebarCommandDefinitionPayload
    }) => updateSidebarCommandDefinition(commandId, payload),
    onSuccess: () => {
      invalidateSidebarCommandQueries()
      setIsFormOpen(false)
      setEditingCommand(null)
      toast.success(t('sidebarCommandAssignment.toast.updateSuccess'))
    },
    onError: () => toast.error(t('sidebarCommandAssignment.toast.updateError')),
  })

  const enabledMutation = useMutation({
    mutationFn: ({
      commandId,
      enabled,
    }: {
      commandId: string
      enabled: boolean
    }) => setSidebarCommandDefinitionEnabled(commandId, enabled),
    onSuccess: () => {
      invalidateSidebarCommandQueries()
      toast.success(t('sidebarCommandAssignment.toast.statusSuccess'))
    },
    onError: () => toast.error(t('sidebarCommandAssignment.toast.statusError')),
  })

  const createCategoryMutation = useMutation({
    mutationFn: createSidebarCommandCategory,
    onSuccess: () => {
      invalidateSidebarCommandQueries()
      setIsCategoryFormOpen(false)
      setEditingCategory(null)
      toast.success(t('sidebarCommandAssignment.toast.categoryCreateSuccess'))
    },
    onError: () =>
      toast.error(t('sidebarCommandAssignment.toast.categoryCreateError')),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: string
      payload: SaveSidebarCommandCategoryPayload
    }) => updateSidebarCommandCategory(categoryId, payload),
    onSuccess: () => {
      invalidateSidebarCommandQueries()
      setIsCategoryFormOpen(false)
      setEditingCategory(null)
      toast.success(t('sidebarCommandAssignment.toast.categoryUpdateSuccess'))
    },
    onError: () =>
      toast.error(t('sidebarCommandAssignment.toast.categoryUpdateError')),
  })

  const categoryEnabledMutation = useMutation({
    mutationFn: ({
      categoryId,
      enabled,
    }: {
      categoryId: string
      enabled: boolean
    }) => setSidebarCommandCategoryEnabled(categoryId, enabled),
    onSuccess: () => {
      invalidateSidebarCommandQueries()
      toast.success(t('sidebarCommandAssignment.toast.categoryStatusSuccess'))
    },
    onError: () =>
      toast.error(t('sidebarCommandAssignment.toast.categoryStatusError')),
  })

  const reorderMutation = useMutation({
    mutationFn: reorderSidebarCommandDefinitions,
    onSuccess: (data) => {
      queryClient.setQueryData(['quick-actions', 'sidebar', 'library'], data)
      invalidateSidebarCommandQueries()
      toast.success(t('sidebarCommandAssignment.toast.sortSuccess'))
    },
    onError: () => toast.error(t('sidebarCommandAssignment.toast.sortError')),
  })

  const openCreateForm = () => {
    setEditingCommand(null)
    setFormRevision((current) => current + 1)
    setIsFormOpen(true)
  }

  const openEditForm = (command: SidebarCommandDefinitionDto) => {
    setEditingCommand(command)
    setFormRevision((current) => current + 1)
    setIsFormOpen(true)
  }

  const closeForm = () => {
    setIsFormOpen(false)
    setEditingCommand(null)
  }

  const openCreateCategoryForm = () => {
    setEditingCategory(null)
    setCategoryFormRevision((current) => current + 1)
    setIsCategoryFormOpen(true)
  }

  const openEditCategoryForm = (category: SidebarCommandCategoryDto) => {
    setEditingCategory(category)
    setCategoryFormRevision((current) => current + 1)
    setIsCategoryFormOpen(true)
  }

  const closeCategoryForm = () => {
    setIsCategoryFormOpen(false)
    setEditingCategory(null)
  }

  const saveCommand = (payload: SaveSidebarCommandDefinitionPayload) => {
    if (editingCommand) {
      updateMutation.mutate({
        commandId: editingCommand.commandId,
        payload: {
          ...payload,
          commandId: editingCommand.commandId,
        },
      })
      return
    }

    createMutation.mutate(payload)
  }

  const saveCategory = (payload: SaveSidebarCommandCategoryPayload) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({
        categoryId: editingCategory.categoryId,
        payload: {
          ...payload,
          categoryId: editingCategory.categoryId,
        },
      })
      return
    }

    createCategoryMutation.mutate(payload)
  }

  const toggleCommandEnabled = (command: SidebarCommandDefinitionDto) => {
    enabledMutation.mutate({
      commandId: command.commandId,
      enabled: !command.enabled,
    })
  }

  const toggleCategoryEnabled = (category: SidebarCommandCategoryDto) => {
    categoryEnabledMutation.mutate({
      categoryId: category.categoryId,
      enabled: !category.enabled,
    })
  }

  const moveCommand = (commandId: string, direction: 'up' | 'down') => {
    const orderedCommands = [...sourceCommands].sort(
      (left, right) => left.sortOrder - right.sortOrder
    )
    const currentIndex = orderedCommands.findIndex(
      (command) => command.commandId === commandId
    )
    if (currentIndex < 0) return

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= orderedCommands.length) return

    const nextCommands = [...orderedCommands]
    const [movingCommand] = nextCommands.splice(currentIndex, 1)
    nextCommands.splice(nextIndex, 0, movingCommand)
    reorderMutation.mutate(nextCommands.map((command) => command.commandId))
  }

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    enabledMutation.isPending ||
    reorderMutation.isPending
  const isCategorySaving =
    createCategoryMutation.isPending ||
    updateCategoryMutation.isPending ||
    categoryEnabledMutation.isPending

  return {
    query,
    setQuery,
    isFormOpen,
    isCategoryFormOpen,
    formRevision,
    categoryFormRevision,
    editingCommand,
    editingCategory,
    commands,
    categories,
    commandsQuery,
    categoriesQuery,
    totalCount: sourceCommands.length,
    totalCategoryCount: sourceCategories.length,
    enabledCount,
    enabledCategoryCount,
    assignableCount,
    isSaving,
    isCategorySaving,
    openCreateForm,
    openEditForm,
    openCreateCategoryForm,
    openEditCategoryForm,
    closeForm,
    closeCategoryForm,
    saveCommand,
    saveCategory,
    toggleCommandEnabled,
    toggleCategoryEnabled,
    moveCommand,
  }
}
