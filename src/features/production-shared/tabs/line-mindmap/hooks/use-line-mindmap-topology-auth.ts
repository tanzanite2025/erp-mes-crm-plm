import { useCallback, useState } from 'react'
import { type DeltaSet } from '@/lib/delta/types'
import type { ProductionLineMutationPayload } from '../../../contracts/production-line-mutation'

export interface PendingTopologyMutation {
  delta: DeltaSet
  lineId: string
  nextSelectedNodeId: string | null
  version: number
}

interface UseLineMindmapTopologyAuthOptions {
  settleSelection: (nextSelectedNodeId: string | null) => void
  updateLineStrict: (
    payload: ProductionLineMutationPayload,
    authCode?: string
  ) => Promise<unknown>
}

export function useLineMindmapTopologyAuth({
  settleSelection,
  updateLineStrict,
}: UseLineMindmapTopologyAuthOptions) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [pendingTopologyMutation, setPendingTopologyMutation] =
    useState<PendingTopologyMutation | null>(null)

  const requestTopologyAuth = useCallback(
    (mutation: PendingTopologyMutation) => {
      setPendingTopologyMutation(mutation)
      setAuthDialogOpen(true)
    },
    []
  )

  const handleAuthConfirm = useCallback(
    async (password: string) => {
      if (!pendingTopologyMutation) {
        return false
      }

      await updateLineStrict(
        {
          type: 'UPDATE',
          id: pendingTopologyMutation.lineId,
          delta: pendingTopologyMutation.delta,
          version: pendingTopologyMutation.version,
        },
        password
      )
      settleSelection(pendingTopologyMutation.nextSelectedNodeId)
      setPendingTopologyMutation(null)
      return true
    },
    [pendingTopologyMutation, settleSelection, updateLineStrict]
  )

  const handleAuthOpenChange = useCallback((open: boolean) => {
    setAuthDialogOpen(open)
    if (!open) {
      setPendingTopologyMutation(null)
    }
  }, [])

  return {
    authDialogOpen,
    handleAuthConfirm,
    handleAuthOpenChange,
    pendingTopologyMutation,
    requestTopologyAuth,
  }
}
