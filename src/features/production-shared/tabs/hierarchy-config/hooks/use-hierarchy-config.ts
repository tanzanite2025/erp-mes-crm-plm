import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import {
  createHierarchyOptionItem,
  createDefaultHierarchyConfigSnapshot,
  getHierarchyLevelOptions,
  HIERARCHY_CONFIG_STORAGE_KEY,
  type HierarchyConfigSnapshot,
  normalizeHierarchyConfigSnapshot,
} from '../data/hierarchy-config'

export function useHierarchyConfig() {
  const [snapshot, setSnapshot] = useState<HierarchyConfigSnapshot>(createDefaultHierarchyConfigSnapshot())
  const [persistedSnapshot, setPersistedSnapshot] = useState<HierarchyConfigSnapshot>(createDefaultHierarchyConfigSnapshot())
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadSnapshot = async () => {
      try {
        const storedSnapshot = await StorageService.getItem<HierarchyConfigSnapshot>(HIERARCHY_CONFIG_STORAGE_KEY)
        if (!isMounted) {
          return
        }

        const normalizedSnapshot = normalizeHierarchyConfigSnapshot(storedSnapshot)
        setSnapshot(normalizedSnapshot)
        setPersistedSnapshot(normalizedSnapshot)
      } catch {
        if (isMounted) {
          toast.error('加载层级配置失败')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSnapshot()

    return () => {
      isMounted = false
    }
  }, [])

  const isDirty = useMemo(() => {
    const levelsDirty = snapshot.levels.some((level, index) => level.name !== persistedSnapshot.levels[index]?.name)

    const optionCatalogsDirty = snapshot.optionCatalogs.some((catalog) => {
      const persistedOptions = getHierarchyLevelOptions(persistedSnapshot.optionCatalogs, catalog.level)
      if (catalog.items.length !== persistedOptions.length) {
        return true
      }

      return catalog.items.some((item, index) => {
        const persistedItem = persistedOptions[index]
        return item.id !== persistedItem?.id
          || item.name !== persistedItem?.name
          || item.code !== persistedItem?.code
          || item.enabled !== persistedItem?.enabled
          || item.sortOrder !== persistedItem?.sortOrder
      })
    })

    return levelsDirty || optionCatalogsDirty
  }, [persistedSnapshot.levels, persistedSnapshot.optionCatalogs, snapshot.levels, snapshot.optionCatalogs])

  const updateLevelName = (level: number, name: string) => {
    setSnapshot((current) => ({
      ...current,
      levels: current.levels.map((item) =>
        item.level === level
          ? {
              ...item,
              name,
            }
          : item,
      ),
    }))
  }

  const validateOptionCatalogs = (catalogs: HierarchyConfigSnapshot['optionCatalogs']) => {
    for (const catalog of catalogs) {
      const nameSet = new Set<string>()
      const codeSet = new Set<string>()

      for (const item of catalog.items) {
        const trimmedName = item.name.trim()
        const trimmedCode = item.code.trim()

        if (trimmedName === '') {
          toast.error(`第 ${catalog.level} 层存在空名称候选项`)
          return false
        }

        if (nameSet.has(trimmedName)) {
          toast.error(`第 ${catalog.level} 层存在重复候选项名称`)
          return false
        }
        nameSet.add(trimmedName)

        if (trimmedCode !== '') {
          if (codeSet.has(trimmedCode)) {
            toast.error(`第 ${catalog.level} 层存在重复候选项编码`)
            return false
          }
          codeSet.add(trimmedCode)
        }
      }
    }

    return true
  }

  const addLevelOption = (level: number, name: string, code: string) => {
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    if (trimmedName === '') {
      toast.error('候选项名称不能为空')
      return false
    }

    const currentCatalog = snapshot.optionCatalogs.find((catalog) => catalog.level === level)
    if (!currentCatalog) {
      return false
    }

    if (currentCatalog.items.some((item) => item.name === trimmedName)) {
      toast.error('同一层级下候选项名称不能重复')
      return false
    }

    if (trimmedCode !== '' && currentCatalog.items.some((item) => item.code === trimmedCode)) {
      toast.error('同一层级下候选项编码不能重复')
      return false
    }

    setSnapshot((current) => ({
      ...current,
      optionCatalogs: current.optionCatalogs.map((catalog) => {
        if (catalog.level !== level) {
          return catalog
        }

        return {
          ...catalog,
          items: [...catalog.items, createHierarchyOptionItem(trimmedName, trimmedCode, catalog.items.length)],
        }
      }),
    }))

    return true
  }

  const updateLevelOption = (level: number, optionId: string, patch: { name?: string; code?: string }) => {
    setSnapshot((current) => ({
      ...current,
      optionCatalogs: current.optionCatalogs.map((catalog) => {
        if (catalog.level !== level) {
          return catalog
        }

        const normalizedName = patch.name?.trim()
        const normalizedCode = patch.code?.trim()

        if (typeof normalizedName === 'string' && normalizedName === '') {
          return catalog
        }

        const currentItem = catalog.items.find((item) => item.id === optionId)
        if (!currentItem) {
          return catalog
        }

        if (
          typeof normalizedName === 'string'
          && catalog.items.some((item) => item.id !== optionId && item.name === normalizedName)
        ) {
          toast.error('同一层级下候选项名称不能重复')
          return catalog
        }

        if (
          typeof normalizedCode === 'string'
          && normalizedCode !== ''
          && catalog.items.some((item) => item.id !== optionId && item.code === normalizedCode)
        ) {
          toast.error('同一层级下候选项编码不能重复')
          return catalog
        }

        return {
          ...catalog,
          items: catalog.items.map((item) => {
            if (item.id !== optionId) {
              return item
            }

            return {
              ...item,
              name: typeof normalizedName === 'string' ? normalizedName : item.name,
              code: typeof normalizedCode === 'string' ? normalizedCode : item.code,
            }
          }),
        }
      }),
    }))
  }

  const toggleLevelOptionEnabled = (level: number, optionId: string) => {
    setSnapshot((current) => ({
      ...current,
      optionCatalogs: current.optionCatalogs.map((catalog) => {
        if (catalog.level !== level) {
          return catalog
        }

        return {
          ...catalog,
          items: catalog.items.map((item) =>
            item.id === optionId
              ? { ...item, enabled: !item.enabled }
              : item,
          ),
        }
      }),
    }))
  }

  const moveLevelOption = (level: number, optionId: string, direction: 'up' | 'down') => {
    setSnapshot((current) => ({
      ...current,
      optionCatalogs: current.optionCatalogs.map((catalog) => {
        if (catalog.level !== level) {
          return catalog
        }

        const currentIndex = catalog.items.findIndex((item) => item.id === optionId)
        if (currentIndex === -1) {
          return catalog
        }

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (targetIndex < 0 || targetIndex >= catalog.items.length) {
          return catalog
        }

        const items = [...catalog.items]
        const [movedItem] = items.splice(currentIndex, 1)
        items.splice(targetIndex, 0, movedItem)

        return {
          ...catalog,
          items: items.map((item, index) => ({
            ...item,
            sortOrder: index,
          })),
        }
      }),
    }))
  }

  const removeLevelOption = (level: number, optionId: string) => {
    setSnapshot((current) => ({
      ...current,
      optionCatalogs: current.optionCatalogs.map((catalog) => {
        if (catalog.level !== level) {
          return catalog
        }

        return {
          ...catalog,
          items: catalog.items
            .filter((item) => item.id !== optionId)
            .map((item, index) => ({
              ...item,
              sortOrder: index,
            })),
        }
      }),
    }))
  }

  const saveConfig = async () => {
    setIsSaving(true)

    try {
      if (!validateOptionCatalogs(snapshot.optionCatalogs)) {
        return
      }

      const nextSnapshot = normalizeHierarchyConfigSnapshot({
        levels: snapshot.levels,
        optionCatalogs: snapshot.optionCatalogs,
        updatedAt: new Date().toISOString(),
      })

      await StorageService.setItem(HIERARCHY_CONFIG_STORAGE_KEY, nextSnapshot)
      setSnapshot(nextSnapshot)
      setPersistedSnapshot(nextSnapshot)
      toast.success('层级配置已保存')
    } catch {
      toast.error('层级配置保存失败')
    } finally {
      setIsSaving(false)
    }
  }

  const resetConfig = async () => {
    setIsSaving(true)

    try {
      const defaultSnapshot = createDefaultHierarchyConfigSnapshot(new Date().toISOString())
      await StorageService.setItem(HIERARCHY_CONFIG_STORAGE_KEY, defaultSnapshot)
      setSnapshot(defaultSnapshot)
      setPersistedSnapshot(defaultSnapshot)
      toast.success('已恢复默认层级配置')
    } catch {
      toast.error('恢复默认层级配置失败')
    } finally {
      setIsSaving(false)
    }
  }

  return {
    levels: snapshot.levels,
    optionCatalogs: snapshot.optionCatalogs,
    isDirty,
    isLoading,
    isSaving,
    saveConfig,
    resetConfig,
    updateLevelName,
    addLevelOption,
    updateLevelOption,
    toggleLevelOptionEnabled,
    moveLevelOption,
    removeLevelOption,
  }
}
