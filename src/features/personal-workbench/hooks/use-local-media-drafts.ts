import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type {
  PersonalLocalMediaDraft,
  PersonalLocalMediaDraftKind,
} from '../data/schema'
import { localMediaDraftStore } from '../services/local-media-draft-store'

function createDraftId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function sortDrafts(items: PersonalLocalMediaDraft[]) {
  return [...items].sort((left, right) => {
    const priorityDiff = (right.queuePriority ?? 0) - (left.queuePriority ?? 0)
    if (priorityDiff !== 0) {
      return priorityDiff
    }
    return right.createdAt.localeCompare(left.createdAt)
  })
}

export function useLocalMediaDrafts() {
  const user = useAuthStore((state) => state.user)
  const [drafts, setDrafts] = useState<PersonalLocalMediaDraft[]>([])
  const [isReady, setIsReady] = useState(false)

  const ownerAccountNo = user?.accountNo ?? ''
  const ownerUserId = user?.id ?? ''

  useEffect(() => {
    let active = true

    if (!ownerUserId || !ownerAccountNo) {
      setDrafts([])
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
        const items = await localMediaDraftStore.getAllByOwner(
          ownerUserId,
          ownerAccountNo
        )
        const migratedItems = await Promise.all(
          items.map(async (item) => {
            let changed = false
            let nextStatus = item.status

            if ((item.status as string) === 'draft') {
              nextStatus = 'local_draft'
              changed = true
            }

            if ((item.status as string) === 'uploaded') {
              nextStatus = 'uploaded'
            }

            const nextDraft: PersonalLocalMediaDraft = {
              ...item,
              queuePriority: item.queuePriority ?? 0,
              status: nextStatus,
            }

            if (item.queuePriority === undefined) {
              changed = true
            }

            if (changed) {
              await localMediaDraftStore.save(nextDraft)
            }

            return nextDraft
          })
        )
        if (active) {
          setDrafts(sortDrafts(migratedItems))
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

  const saveDraft = useCallback(
    async ({
      durationSeconds,
      file,
      kind,
    }: {
      durationSeconds?: number
      file: File
      kind: PersonalLocalMediaDraftKind
    }) => {
      if (
        typeof window === 'undefined' ||
        !('indexedDB' in window) ||
        !ownerUserId ||
        !ownerAccountNo
      ) {
        return null
      }

      const draft: PersonalLocalMediaDraft = {
        id: createDraftId(),
        kind,
        ownerAccountNo,
        ownerUserId,
        queuePriority: 0,
        status: 'local_draft',
        file,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
        durationSeconds,
      }

      await localMediaDraftStore.save(draft)
      setDrafts((current) => sortDrafts([draft, ...current]))
      return draft
    },
    [ownerAccountNo, ownerUserId]
  )

  const updateDraft = useCallback(
    async (draft: PersonalLocalMediaDraft) => {
      if (
        typeof window === 'undefined' ||
        !('indexedDB' in window) ||
        !ownerUserId ||
        !ownerAccountNo
      ) {
        return null
      }

      const nextDraft: PersonalLocalMediaDraft = {
        ...draft,
        ownerAccountNo: draft.ownerAccountNo ?? ownerAccountNo,
        ownerUserId: draft.ownerUserId ?? ownerUserId,
        queuePriority: draft.queuePriority ?? 0,
      }

      await localMediaDraftStore.save(nextDraft)
      setDrafts((current) =>
        sortDrafts(
          current.map((item) => (item.id === nextDraft.id ? nextDraft : item))
        )
      )
      return nextDraft
    },
    [ownerAccountNo, ownerUserId]
  )

  const removeDraft = useCallback(async (id: string) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return
    }

    await localMediaDraftStore.remove(id)
    setDrafts((current) => current.filter((item) => item.id !== id))
  }, [])

  const reprioritizeDraft = useCallback(
    async (id: string, queuePriority: number) => {
      const target = drafts.find((item) => item.id === id)
      if (!target) {
        return null
      }

      const nextDraft: PersonalLocalMediaDraft = {
        ...target,
        queuePriority,
      }

      await localMediaDraftStore.save(nextDraft)
      setDrafts((current) =>
        sortDrafts(current.map((item) => (item.id === id ? nextDraft : item)))
      )
      return nextDraft
    },
    [drafts]
  )

  const clearLinkedDrafts = useCallback(async () => {
    const linkedDrafts = drafts.filter(
      (item) => item.status === 'linked_to_record'
    )
    await Promise.all(
      linkedDrafts.map((item) => localMediaDraftStore.remove(item.id))
    )
    setDrafts((current) =>
      current.filter((item) => item.status !== 'linked_to_record')
    )
    return linkedDrafts.length
  }, [drafts])

  const getDraftById = useCallback(
    (id: string | null) => {
      if (!id) {
        return null
      }
      return drafts.find((item) => item.id === id) ?? null
    },
    [drafts]
  )

  return {
    drafts,
    getDraftById,
    isReady,
    clearLinkedDrafts,
    removeDraft,
    reprioritizeDraft,
    saveDraft,
    updateDraft,
  }
}
