import { useCallback, useState } from 'react'
import { type DeltaSet } from '@/lib/delta/types'
import type { LineMutationPayload } from '../../line-mgmt/hooks/use-line-mgmt-lines'

export interface PendingTopologyMutation {
  delta: DeltaSet
  lineId: string
  nextSelectedNodeId: string | null
  version: number
}

interface UseLineMindmapTopologyAuthOptions {
  settleSelection: (nextSelectedNodeId: string | null) => void
  updateLine: (payload: LineMutationPayload, authCode?: string) => Promise<void> | void
}

export function useLineMindmapTopologyAuth({
  settleSelection,
  updateLine,
}: UseLineMindmapTopologyAuthOptions) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [pendingTopologyMutation, setPendingTopologyMutation] = useState<PendingTopologyMutation | null>(null)

  const requestTopologyAuth = useCallback((mutation: PendingTopologyMutation) => {
    setPendingTopologyMutation(mutation)
    setAuthDialogOpen(true)
  }, [])

  const handleAuthConfirm = useCallback((password: string) => {
    if (!pendingTopologyMutation) {
      return
    }

    void updateLine(
      {
        type: 'UPDATE',
        id: pendingTopologyMutation.lineId,
        delta: pendingTopologyMutation.delta,
        version: pendingTopologyMutation.version,
      },
      password,
    )
    settleSelection(pendingTopologyMutation.nextSelectedNodeId)
    setPendingTopologyMutation(null)
  }, [pendingTopologyMutation, settleSelection, updateLine])

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
