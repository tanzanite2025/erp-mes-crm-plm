import { useCallback } from 'react'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import type { ProductionLineMutationPayload } from '../../../contracts/production-line-mutation'
import type { ProductionLine } from '../../../data/production-line'
import {
  addSegmentToLine,
  removeSegmentFromLine,
  renameSegmentInLine,
} from '../../../topology/line-topology-helpers'
import type { LineMindmapNode } from '../data/line-mindmap-domain'
import type { PendingTopologyMutation } from './use-line-mindmap-topology-auth'

interface UseLineMindmapActionsOptions {
  activeLine: ProductionLine | null
  requestTopologyAuth: (mutation: PendingTopologyMutation) => void
  selectedNode: LineMindmapNode | null
  settleSelection: (nextSelectedNodeId: string | null) => void
  updateLineStrict: (
    payload: ProductionLineMutationPayload,
    authCode?: string
  ) => Promise<unknown>
}

export function useLineMindmapActions({
  activeLine,
  requestTopologyAuth,
  selectedNode,
  settleSelection,
  updateLineStrict,
}: UseLineMindmapActionsOptions) {
  const submitTopologyMutation = useCallback(
    async (updatedLine: ProductionLine, nextSelectedNodeId: string | null) => {
      if (!activeLine) {
        return
      }

      const tracker = trackDelta(activeLine)
      Object.assign(tracker.data, updatedLine)
      const delta = tracker.commit()
      if (Object.keys(delta).length === 0) {
        return
      }

      const requiresAuth = Boolean(
        activeLine.id && !activeLine.id.startsWith('temp-')
      )

      if (!requiresAuth) {
        await updateLineStrict({
          type: 'UPDATE',
          id: activeLine.id,
          delta,
          version: activeLine.version,
        })
        settleSelection(nextSelectedNodeId)
        return
      }

      requestTopologyAuth({
        delta,
        lineId: activeLine.id,
        nextSelectedNodeId,
        version: activeLine.version,
      })
    },
    [activeLine, requestTopologyAuth, settleSelection, updateLineStrict]
  )

  const handleAddSegment = useCallback(
    async (name: string) => {
      if (!activeLine) {
        return
      }

      const updatedLine = addSegmentToLine(activeLine, name)
      const nextSegment = updatedLine.segments[updatedLine.segments.length - 1]
      const nextSelectedId = nextSegment?.id
        ? `segment-${nextSegment.id}`
        : null
      await submitTopologyMutation(updatedLine, nextSelectedId)
    },
    [activeLine, submitTopologyMutation]
  )

  const handleRenameSelected = useCallback(
    async (name: string) => {
      if (
        !activeLine ||
        !selectedNode ||
        selectedNode.sourceType !== 'segment' ||
        !selectedNode.sourceId
      ) {
        return
      }

      const updatedLine = renameSegmentInLine(
        activeLine,
        selectedNode.sourceId,
        name
      )
      await submitTopologyMutation(updatedLine, selectedNode.id)
    },
    [activeLine, selectedNode, submitTopologyMutation]
  )

  const handleDeleteSelected = useCallback(async () => {
    if (
      !activeLine ||
      !selectedNode ||
      selectedNode.sourceType !== 'segment' ||
      !selectedNode.sourceId
    ) {
      return
    }

    const currentIndex = activeLine.segments.findIndex(
      (segment) => segment.id === selectedNode.sourceId
    )
    if (currentIndex < 0) {
      return
    }

    const updatedLine = removeSegmentFromLine(activeLine, selectedNode.sourceId)
    const nextSegment =
      updatedLine.segments[currentIndex] ??
      updatedLine.segments[currentIndex - 1] ??
      null
    const nextSelectedId = nextSegment ? `segment-${nextSegment.id}` : null
    await submitTopologyMutation(updatedLine, nextSelectedId)
  }, [activeLine, selectedNode, submitTopologyMutation])

  return {
    handleAddSegment,
    handleDeleteSelected,
    handleRenameSelected,
    submitTopologyMutation,
  }
}
