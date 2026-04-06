import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type DictionaryEntry, type DictionaryGroup } from '../data/schema'
import { dictionaryService } from '../services/dictionary-service'
import { createDraftEntry, createNewGroup, filterEntries } from '../utils/dictionary-mgmt-utils'

export function useDictionaryMgmt() {
    const { t } = useLanguage()
    
    // 核心状态自治
    const [groups, setGroups] = useState<DictionaryGroup[]>([])
    const [entries, setEntries] = useState<DictionaryEntry[]>([])
    const [activeGroupId, setActiveGroupId] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')
    const [isSyncing, setIsSyncing] = useState(false)
    
    // 弹窗与编辑状态
    const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false)
    const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)

    // 1. 初始化与数据刷新逻辑
    const refreshData = useCallback(async (silent = false) => {
        if (!silent) setIsSyncing(true)
        try {
            await dictionaryService.init()
            const initialGroups = dictionaryService.getGroups()
            const initialEntries = dictionaryService.getEntries()
            
            setGroups(initialGroups)
            setEntries(initialEntries)
            
            // 如果没有激活分组，默认选中第一个
            if (initialGroups.length > 0 && !activeGroupId) {
                setActiveGroupId(initialGroups[0].id)
            }
        } finally {
            if (!silent) setIsSyncing(false)
        }
    }, [activeGroupId])

    useEffect(() => {
        void refreshData()
        
        const handleUpdate = () => void refreshData(true)
        window.addEventListener('xdfc_dictionary_updated', handleUpdate)
        return () => window.removeEventListener('xdfc_dictionary_updated', handleUpdate)
    }, [refreshData])

    // 2. 派生状态
    const filteredEntries = useMemo(() => {
        return filterEntries(entries, activeGroupId, searchTerm)
    }, [entries, activeGroupId, searchTerm])

    // 3. 业务操作封装
    
    // 保存分组
    const saveGroups = async (newGroups: DictionaryGroup[]) => {
        setGroups(newGroups)
        await dictionaryService.saveGroups(newGroups)
    }

    // 保存字典项
    const saveEntries = async (newEntries: DictionaryEntry[]) => {
        setEntries(newEntries)
        await dictionaryService.saveEntries(newEntries)
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

    const handleAddGroup = async () => {
        const name = window.prompt(t('basicSettings.dictionaryActions.prompts.newGroup'))
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

        if (window.confirm(t('basicSettings.dictionaryActions.prompts.deleteGroup', { name: group.name }))) {
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
        const newName = window.prompt(t('basicSettings.dictionaryActions.prompts.renameGroup'), group.name)
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
        setIsEntryDialogOpen(false)
        setEditingEntry(null)
    }

    const handleDeleteEntry = async (entryId: string) => {
        if (window.confirm(t('basicSettings.dictionaryActions.prompts.deleteEntry'))) {
            await saveEntries(entries.filter((entry) => entry.id !== entryId))
            toast.info(t('basicSettings.dictionaryActions.toasts.entryDeleted'))
        }
    }

    return {
        // 状态
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
        
        // 操作
        handleSyncSystem,
        handleAddGroup,
        handleDeleteGroup,
        handleEditGroup,
        handleAddEntry,
        handleEditEntry,
        handleConfirmEntry,
        handleDeleteEntry,
        refreshData
    }
}
