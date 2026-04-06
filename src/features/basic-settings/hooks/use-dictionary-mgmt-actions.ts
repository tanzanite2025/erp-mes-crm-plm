import { type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type DictionaryEntry, type DictionaryGroup } from '../data/schema'
import { dictionaryService } from '../services/dictionary-service'
import { createDraftEntry, createNewGroup } from '../utils/dictionary-mgmt-utils'

interface UseDictionaryMgmtActionsParams {
  groups: DictionaryGroup[]
  entries: DictionaryEntry[]
  activeGroupId: string
  editingEntry: DictionaryEntry | null
  setActiveGroupId: Dispatch<SetStateAction<string>>
  setEditingEntry: Dispatch<SetStateAction<DictionaryEntry | null>>
  setIsEntryDialogOpen: Dispatch<SetStateAction<boolean>>
  setIsSyncing: Dispatch<SetStateAction<boolean>>
  saveGroups: (newGroups: DictionaryGroup[]) => Promise<void>
  saveEntries: (newEntries: DictionaryEntry[]) => Promise<void>
}

export function useDictionaryMgmtActions({
  groups,
  entries,
  activeGroupId,
  editingEntry,
  setActiveGroupId,
  setEditingEntry,
  setIsEntryDialogOpen,
  setIsSyncing,
  saveGroups,
  saveEntries,
}: UseDictionaryMgmtActionsParams) {
  const { t } = useLanguage()

  const handleAddGroup = async () => {
    const name = prompt(t('basicSettings.dictionaryActions.prompts.newGroup'))
    if (name) {
      const newGroup = createNewGroup(name)
      await saveGroups([...groups, newGroup])
      setActiveGroupId(newGroup.id)
      toast.success(t('basicSettings.dictionaryActions.toasts.groupCreated', { name }))
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find((item) => item.id === groupId)
    if (!group) return

    if (
      confirm(
        t('basicSettings.dictionaryActions.prompts.deleteGroup', {
          name: group.name,
        })
      )
    ) {
      const newGroups = groups.filter((item) => item.id !== groupId)
      const newEntries = entries.filter((item) => item.groupId !== groupId)

      await Promise.all([saveGroups(newGroups), saveEntries(newEntries)])

      if (activeGroupId === groupId && newGroups.length > 0) {
        setActiveGroupId(newGroups[0].id)
      }
      toast.success(t('basicSettings.dictionaryActions.toasts.groupDeleted', { name: group.name }))
    }
  }

  const handleEditGroup = async (group: DictionaryGroup) => {
    const newName = prompt(t('basicSettings.dictionaryActions.prompts.renameGroup'), group.name)
    if (newName && newName !== group.name) {
      const newGroups = groups.map((item) =>
        item.id === group.id ? { ...item, name: newName } : item
      )
      await saveGroups(newGroups)
      toast.success(t('basicSettings.dictionaryActions.toasts.groupUpdated'))
    }
  }

  const handleAddEntry = () => {
    setEditingEntry(createDraftEntry(activeGroupId))
    setIsEntryDialogOpen(true)
  }

  const handleEditEntry = (entry: DictionaryEntry) => {
    setEditingEntry(entry)
    setIsEntryDialogOpen(true)
  }

  const handleConfirmEntry = async (data: DictionaryEntry) => {
    if (editingEntry && editingEntry.id !== '') {
      await saveEntries(entries.map((item) => (item.id === editingEntry.id ? data : item)))
      toast.success(t('basicSettings.dictionaryActions.toasts.entryUpdated', { label: data.label }))
    } else {
      const newEntry = { ...data, id: crypto.randomUUID() }
      await saveEntries([...entries, newEntry])
      toast.success(t('basicSettings.dictionaryActions.toasts.entryCreated', { label: data.label }))
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm(t('basicSettings.dictionaryActions.prompts.deleteEntry'))) {
      await saveEntries(entries.filter((entry) => entry.id !== entryId))
      toast.info(t('basicSettings.dictionaryActions.toasts.entryDeleted'))
    }
  }

  const handleSyncSystem = async () => {
    setIsSyncing(true)
    toast.promise(dictionaryService.syncSystemDictionary(), {
      loading: t('basicSettings.dictionaryActions.toasts.syncLoading'),
      success: () => {
        setIsSyncing(false)
        return t('basicSettings.dictionaryActions.toasts.syncSuccess')
      },
      error: (err) => {
        setIsSyncing(false)
        return t('basicSettings.dictionaryActions.toasts.syncFailed', { message: err.message })
      },
    })
  }

  return {
    handleAddGroup,
    handleDeleteGroup,
    handleEditGroup,
    handleAddEntry,
    handleEditEntry,
    handleConfirmEntry,
    handleDeleteEntry,
    handleSyncSystem,
  }
}
