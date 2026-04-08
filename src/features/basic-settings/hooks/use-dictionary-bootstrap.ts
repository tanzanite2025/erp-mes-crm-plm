import { type Dispatch, type SetStateAction, useEffect } from 'react'
import { type DictionaryEntry, type DictionaryGroup } from '../data/schema'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { DictionaryCoreService } from '../services/dictionary-core-service'

interface UseDictionaryBootstrapParams {
    activeGroupId: string
    setGroups: Dispatch<SetStateAction<DictionaryGroup[]>>
    setEntries: Dispatch<SetStateAction<DictionaryEntry[]>>
    setActiveGroupId: Dispatch<SetStateAction<string>>
    setMemo: Dispatch<SetStateAction<string>>
    memoKey: string
    defaultMemo: string
}

export function useDictionaryBootstrap({
    activeGroupId,
    setGroups,
    setEntries,
    setActiveGroupId,
    setMemo,
    memoKey,
    defaultMemo
}: UseDictionaryBootstrapParams) {
    useEffect(() => {
        const refreshData = async () => {
            await DictionaryCoreService.init()

            const initialGroups = DictionaryCoreService.getGroups()
            const initialEntries = DictionaryCoreService.getEntries()
            setGroups(initialGroups)
            setEntries(initialEntries)
            if (initialGroups.length > 0 && !activeGroupId) {
                setActiveGroupId(initialGroups[0].id)
            }
        }

        refreshData()

        const loadMemo = async () => {
            const storedMemo = await StorageService.getItem<string>(memoKey)
            setMemo(storedMemo || defaultMemo)
        }
        loadMemo()

        window.addEventListener('xdfc_dictionary_updated', refreshData)
        return () => window.removeEventListener('xdfc_dictionary_updated', refreshData)
    }, [
        activeGroupId,
        defaultMemo,
        memoKey,
        setActiveGroupId,
        setEntries,
        setGroups,
        setMemo
    ])
}
