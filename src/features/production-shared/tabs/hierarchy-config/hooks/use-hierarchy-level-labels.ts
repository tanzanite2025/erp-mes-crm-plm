import { useEffect, useMemo, useState } from 'react'
import {
  StorageService,
  XDFC_STORAGE_EVENT,
} from '@/features/system-mgmt/services/storage-service'
import {
  createDefaultHierarchyConfigSnapshot,
  getHierarchyLevelName,
  HIERARCHY_CONFIG_STORAGE_KEY,
  type HierarchyConfigSnapshot,
  normalizeHierarchyConfigSnapshot,
} from '../data/hierarchy-config'

export function useHierarchyLevelLabels() {
  const [snapshot, setSnapshot] = useState<HierarchyConfigSnapshot>(
    createDefaultHierarchyConfigSnapshot()
  )

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
      levels: snapshot.levels,
      level1Name: getHierarchyLevelName(snapshot.levels, 1),
      level2Name: getHierarchyLevelName(snapshot.levels, 2),
      level3Name: getHierarchyLevelName(snapshot.levels, 3),
    }),
    [snapshot.levels]
  )
}
