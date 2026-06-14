import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type {
  PersonalWorkspaceItem,
  PersonalWorkspaceItemDraft,
  PersonalWorkspaceLinkItem,
  PersonalWorkspaceNoteItem,
} from '../data/schema'
import { workspaceItemStore } from '../services/workspace-item-store'

function createItemId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function sortItems(items: PersonalWorkspaceItem[]) {
  return [...items].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt)
  )
}

export function useWorkspaceItems() {
  const user = useAuthStore((state) => state.user)
  const [items, setItems] = useState<PersonalWorkspaceItem[]>([])
  const [isReady, setIsReady] = useState(false)

  const ownerAccountNo = user?.accountNo ?? ''
  const ownerUserId = user?.id ?? ''

  useEffect(() => {
    let active = true

    if (!ownerUserId || !ownerAccountNo) {
      setItems([])
      setIsReady(true)
      return () => {
        active = false
      }
    }

    setIsReady(false)

    void (async () => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        setIsReady(true)
        return
      }

      try {
        const nextItems = await workspaceItemStore.getAllByOwner(
          ownerUserId,
          ownerAccountNo
        )
        if (active) {
          setItems(sortItems(nextItems))
        }
      } finally {
        if (active) {
          setIsReady(true)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [ownerAccountNo, ownerUserId])

  const createItem = useCallback(
    async (draft: PersonalWorkspaceItemDraft) => {
      if (
        typeof window === 'undefined' ||
        !('indexedDB' in window) ||
        !ownerUserId ||
        !ownerAccountNo
      ) {
        return null
      }

      const now = new Date().toISOString()
      const base = {
        createdAt: now,
        id: createItemId(),
        ownerAccountNo,
        ownerUserId,
        updatedAt: now,
      }

      const item: PersonalWorkspaceItem =
        draft.type === 'note'
          ? ({
              ...base,
              content: draft.content ?? '',
              title: draft.title,
              type: 'note',
            } satisfies PersonalWorkspaceNoteItem)
          : ({
              ...base,
              remark: draft.remark ?? '',
              title: draft.title,
              type: 'link',
              url: draft.url ?? '',
            } satisfies PersonalWorkspaceLinkItem)

      await workspaceItemStore.save(item)
      setItems((current) => sortItems([item, ...current]))
      return item
    },
    [ownerAccountNo, ownerUserId]
  )

  const updateItem = useCallback(
    async (item: PersonalWorkspaceItem) => {
      if (
        typeof window === 'undefined' ||
        !('indexedDB' in window) ||
        !ownerUserId ||
        !ownerAccountNo
      ) {
        return null
      }

      const nextItem: PersonalWorkspaceItem = {
        ...item,
        ownerAccountNo: item.ownerAccountNo ?? ownerAccountNo,
        ownerUserId: item.ownerUserId ?? ownerUserId,
        updatedAt: new Date().toISOString(),
      }

      await workspaceItemStore.save(nextItem)
      setItems((current) =>
        sortItems(
          current.map((entry) => (entry.id === nextItem.id ? nextItem : entry))
        )
      )
      return nextItem
    },
    [ownerAccountNo, ownerUserId]
  )

  const removeItem = useCallback(async (id: string) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return
    }

    await workspaceItemStore.remove(id)
    setItems((current) => current.filter((entry) => entry.id !== id))
  }, [])

  return {
    createItem,
    isReady,
    items,
    removeItem,
    updateItem,
  }
}
