import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type DictionaryEntry, type DictionaryGroup } from '../data/schema'
import { DictionaryCoreService } from '../services/dictionary-core-service'
import { DictionaryMaintenanceService } from '../services/dictionary-maintenance-service'
import { createDraftEntry, filterEntries } from '../utils/dictionary-mgmt-utils'

function buildGroupCode(name: string) {
    const base = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    return `${base || 'GROUP'}_${Date.now()}`
}

export function useDictionaryMgmt() {
    const { t } = useLanguage()
    const showActionError = (err: unknown) => {
        const message = err instanceof Error ? err.message : '操作失败，请稍后重试'
        toast.error(message)
    }

    const [groups, setGroups] = useState<DictionaryGroup[]>([])
    const [entries, setEntries] = useState<DictionaryEntry[]>([])
    const [activeGroupId, setActiveGroupId] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)

    const applySnapshot = useCallback(() => {
        const nextGroups = DictionaryCoreService.getGroups()
        const nextEntries = DictionaryCoreService.getEntries()
        setGroups(nextGroups)
        setEntries(nextEntries)
        if (nextGroups.length > 0 && !activeGroupId) {
            setActiveGroupId(nextGroups[0].id)
        }
    }, [activeGroupId])

    const refreshData = useCallback(async (silent = false, forceReload = false) => {
        if (!silent) setIsSyncing(true)
        try {
            if (forceReload) {
                await DictionaryCoreService.refresh()
            } else {
                await DictionaryCoreService.init()
            }
            applySnapshot()
        } finally {
            if (!silent) setIsSyncing(false)
        }
    }, [applySnapshot])

    useEffect(() => {
        void refreshData(false, true)

        const handleUpdate = () => applySnapshot()
        window.addEventListener('xdfc_dictionary_updated', handleUpdate)
        return () => window.removeEventListener('xdfc_dictionary_updated', handleUpdate)
    }, [applySnapshot, refreshData])

    const filteredEntries = useMemo(() => {
        return filterEntries(entries, activeGroupId, searchTerm)
    }, [entries, activeGroupId, searchTerm])

    const handleSyncSystem = async () => {
        setIsSyncing(true)
        toast.promise(DictionaryMaintenanceService.syncSystemDictionary(), {
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

    const handleAddGroup = async () => {
        const name = window.prompt(t('basicSettings.dictionaryActions.prompts.newGroup'))
        if (!name) return

        try {
            const created = await DictionaryMaintenanceService.createGroup({
                name,
                code: buildGroupCode(name),
                active: true,
            })
            await refreshData(true)
            setActiveGroupId(created.id)
            toast.success(t('basicSettings.dictionaryActions.toasts.groupCreated', { name }))
        } catch (err) {
            showActionError(err)
        }
    }

    const handleDeleteGroup = async (groupId: string) => {
        const group = groups.find((item) => item.id === groupId)
        if (!group) return

        if (window.confirm(t('basicSettings.dictionaryActions.prompts.deleteGroup', { name: group.name }))) {
            try {
                await DictionaryMaintenanceService.deleteGroup(group.code)
                await refreshData(true)

                if (activeGroupId === groupId) {
                    const remainingGroups = DictionaryCoreService.getGroups()
                    setActiveGroupId(remainingGroups[0]?.id ?? '')
                }
                toast.success(t('basicSettings.dictionaryActions.toasts.groupDeleted', { name: group.name }))
            } catch (err) {
                showActionError(err)
            }
        }
    }

    const handleEditGroup = async (group: DictionaryGroup) => {
        const newName = window.prompt(t('basicSettings.dictionaryActions.prompts.renameGroup'), group.name)
        if (!newName || newName === group.name) return
        try {
            if (!group.updatedAt) {
                throw new Error('Missing group version for conflict-safe update')
            }

            await DictionaryMaintenanceService.patchGroup(group.code, {
                name: newName,
                version: group.updatedAt,
            })
            await refreshData(true)
            toast.success(t('basicSettings.dictionaryActions.toasts.groupUpdated'))
        } catch (err) {
            showActionError(err)
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
        try {
            if (editingEntry && editingEntry.id !== '') {
                if (!editingEntry.code || !editingEntry.updatedAt) {
                    throw new Error('Missing entry code/version for conflict-safe update')
                }
                await DictionaryMaintenanceService.patchEntry(editingEntry.code, {
                    label: data.label,
                    description: data.description,
                    options: (data.options ?? []) as any[],
                    sortOrder: data.sortOrder,
                    active: data.active,
                    version: editingEntry.updatedAt,
                })
                toast.success(t('basicSettings.dictionaryActions.toasts.entryUpdated', { label: data.label }))
            } else {
                await DictionaryMaintenanceService.createEntry({
                    groupId: data.groupId,
                    label: data.label,
                    code: data.code || `ATTR_${Date.now()}`,
                    description: data.description,
                    options: (data.options ?? []) as any[],
                    sortOrder: data.sortOrder,
                    active: data.active,
                })
                toast.success(t('basicSettings.dictionaryActions.toasts.entryCreated', { label: data.label }))
            }

            await refreshData(true)
            setIsEntryDialogOpen(false)
            setEditingEntry(null)
        } catch (err) {
            showActionError(err)
            throw err
        }
    }

    const handleDeleteEntry = async (entryId: string) => {
        const entry = entries.find((item) => item.id === entryId)
        if (!entry?.code) return

        if (window.confirm(t('basicSettings.dictionaryActions.prompts.deleteEntry'))) {
            try {
                await DictionaryMaintenanceService.deleteEntry(entry.code)
                await refreshData(true)
                toast.info(t('basicSettings.dictionaryActions.toasts.entryDeleted'))
            } catch (err) {
                showActionError(err)
            }
        }
    }

    return {
        groups,
        activeGroupId,
        setActiveGroupId,
        searchTerm,
        setSearchTerm,
        isSyncing,
        filteredEntries,
        isEntryDialogOpen,
        setIsEntryDialogOpen,
        editingEntry,
        handleSyncSystem,
        handleAddGroup,
        handleDeleteGroup,
        handleEditGroup,
        handleAddEntry,
        handleEditEntry,
        handleConfirmEntry,
        handleDeleteEntry,
        refreshData,
    }
}
