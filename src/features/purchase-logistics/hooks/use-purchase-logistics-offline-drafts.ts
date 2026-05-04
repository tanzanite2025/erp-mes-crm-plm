import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { XDFC_STORAGE_EVENT } from '@/features/system-mgmt/services/storage-service'
import { PURCHASE_LOGISTICS_KEYS } from '../query-keys'
import {
  PURCHASE_LOGISTICS_DRAFT_KEY,
  invalidatePurchaseLogisticsOfflineDraftCache,
  listPurchaseLogisticsOfflineDrafts,
  removePurchaseLogisticsOfflineDraft,
  syncPurchaseLogisticsOfflineDrafts,
  type PurchaseLogisticsOfflineDraft,
} from '../services/purchase-logistics-offline-draft-service'

export function usePurchaseLogisticsOfflineDrafts() {
  const queryClient = useQueryClient()

  const draftsQuery = useQuery({
    queryKey: PURCHASE_LOGISTICS_KEYS.offlineDrafts,
    queryFn: async () => listPurchaseLogisticsOfflineDrafts(),
    staleTime: Infinity,
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleStorage = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { key?: string } | undefined : undefined
      if (detail?.key && detail.key !== PURCHASE_LOGISTICS_DRAFT_KEY) {
        return
      }
      invalidatePurchaseLogisticsOfflineDraftCache()
      void queryClient.invalidateQueries({ queryKey: PURCHASE_LOGISTICS_KEYS.offlineDrafts })
    }

    window.addEventListener(XDFC_STORAGE_EVENT, handleStorage)
    window.addEventListener(`${PURCHASE_LOGISTICS_DRAFT_KEY}_updated`, handleStorage)
    return () => {
      window.removeEventListener(XDFC_STORAGE_EVENT, handleStorage)
      window.removeEventListener(`${PURCHASE_LOGISTICS_DRAFT_KEY}_updated`, handleStorage)
    }
  }, [queryClient])

  const invalidateDrafts = React.useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: PURCHASE_LOGISTICS_KEYS.offlineDrafts })
  }, [queryClient])

  const removeDraft = React.useCallback(async (id: string) => {
    await removePurchaseLogisticsOfflineDraft(id)
    await invalidateDrafts()
  }, [invalidateDrafts])

  const syncDrafts = React.useCallback(async () => {
    const result = await syncPurchaseLogisticsOfflineDrafts()
    await invalidateDrafts()
    return result
  }, [invalidateDrafts])

  return {
    drafts: (draftsQuery.data ?? []) as PurchaseLogisticsOfflineDraft[],
    invalidateDrafts,
    removeDraft,
    syncDrafts,
  }
}
