import { useEffect, useMemo, useState } from 'react'
import {
  StorageService,
  XDFC_STORAGE_EVENT,
} from '@/features/system-mgmt/services/storage-service'
import {
  createDefaultHierarchyConfigSnapshot,
  getHierarchyLevelOptions,
  type HierarchyLevelOptionItem,
  HIERARCHY_CONFIG_STORAGE_KEY,
  type HierarchyConfigSnapshot,
  normalizeHierarchyConfigSnapshot,
} from '../data/hierarchy-config'

function filterHierarchyLevelOptions(
  items: HierarchyLevelOptionItem[],
  includeDisabled: boolean
) {
  if (includeDisabled) {
    return items
  }

  return items.filter((item) => item.enabled)
}

export function useHierarchyLevelOptions(options?: {
  includeDisabled?: boolean
}) {
  const [snapshot, setSnapshot] = useState<HierarchyConfigSnapshot>(
    createDefaultHierarchyConfigSnapshot()
  )
  const includeDisabled = options?.includeDisabled ?? false

  useEffect(() => {
    let alive = true

    const loadSnapshot = async () => {
      try {
        const storedSnapshot =
          await StorageService.getItem<HierarchyConfigSnapshot>(
            HIERARCHY_CONFIG_STORAGE_KEY
          )
        if (!alive) {
          return
        }
        setSnapshot(normalizeHierarchyConfigSnapshot(storedSnapshot))
      } catch {
        if (alive) {
          setSnapshot(createDefaultHierarchyConfigSnapshot())
        }
      }
    }

    const handleStorageEvent = (event?: Event) => {
      if (event instanceof CustomEvent) {
        const detail = event.detail as
          | { key?: string; action?: 'SET' | 'REMOVE' }
          | undefined
        if (detail?.key && detail.key !== HIERARCHY_CONFIG_STORAGE_KEY) {
          return
        }
        if (detail?.action === 'REMOVE') {
          setSnapshot(createDefaultHierarchyConfigSnapshot())
          return
        }
      }

      void loadSnapshot()
    }

    void loadSnapshot()
    window.addEventListener(XDFC_STORAGE_EVENT, handleStorageEvent)
    window.addEventListener(
      `${HIERARCHY_CONFIG_STORAGE_KEY}_updated`,
      handleStorageEvent
    )

    return () => {
      alive = false
      window.removeEventListener(XDFC_STORAGE_EVENT, handleStorageEvent)
      window.removeEventListener(
        `${HIERARCHY_CONFIG_STORAGE_KEY}_updated`,
        handleStorageEvent
      )
    }
  }, [])

  return useMemo(
    () => ({
      level1Options: filterHierarchyLevelOptions(
        getHierarchyLevelOptions(snapshot.optionCatalogs, 1),
        includeDisabled
      ),
      level2Options: filterHierarchyLevelOptions(
        getHierarchyLevelOptions(snapshot.optionCatalogs, 2),
        includeDisabled
      ),
      level3Options: filterHierarchyLevelOptions(
        getHierarchyLevelOptions(snapshot.optionCatalogs, 3),
        includeDisabled
      ),
    }),
    [includeDisabled, snapshot.optionCatalogs]
  )
}
