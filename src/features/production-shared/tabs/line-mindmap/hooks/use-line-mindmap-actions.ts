import { useCallback } from 'react'
import { trackDelta } from '@/lib/delta/proxy-tracker'
import type { ProductionLine } from '../../../data/production-line'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import type { LineMutationPayload } from '../../line-mgmt/hooks/use-line-mgmt-lines'
import {
  addJobCategoryToLine,
  addSegmentToLine,
  removeJobCategoryFromLine,
  removeSegmentFromLine,
  rebindJobCategoryInLine,
  rebindSegmentInLine,
  renameJobCategoryInLine,
  renameSegmentInLine,
} from '../../line-mgmt/utils/line-topology-helpers'
import type { LineMindmapNode } from '../data/sample-mindmap'
import type { PendingTopologyMutation } from './use-line-mindmap-topology-auth'

interface UseLineMindmapActionsOptions {
  activeLine: ProductionLine | null
  requestTopologyAuth: (mutation: PendingTopologyMutation) => void
  selectedNode: LineMindmapNode | null
  settleSelection: (nextSelectedNodeId: string | null) => void
  updateLine: (payload: LineMutationPayload, authCode?: string) => Promise<void> | void
}

export function useLineMindmapActions({
  activeLine,
  requestTopologyAuth,
  selectedNode,
  settleSelection,
  updateLine,
}: UseLineMindmapActionsOptions) {
  const getParentSegmentForJobCategory = useCallback((jobCategoryId: string) => {
    if (!activeLine) {
      return null
    }

    return activeLine.segments.find((segment) =>
      (segment.jobCategories || []).some((jobCategory) => jobCategory.id === jobCategoryId),
    ) ?? null
  }, [activeLine])

  const submitTopologyMutation = useCallback((updatedLine: ProductionLine, nextSelectedNodeId: string | null) => {
    if (!activeLine) {
      return
    }

    const tracker = trackDelta(activeLine)
    Object.assign(tracker.data, updatedLine)
    const delta = tracker.commit()
    if (Object.keys(delta).length === 0) {
      return
    }

    const requiresAuth = Boolean(activeLine.id && !activeLine.id.startsWith('temp-'))

    if (!requiresAuth) {
      void updateLine({ type: 'UPDATE', id: activeLine.id, delta, version: activeLine.version })
      settleSelection(nextSelectedNodeId)
      return
    }

    requestTopologyAuth({
      delta,
      lineId: activeLine.id,
      nextSelectedNodeId,
      version: activeLine.version,
    })
  }, [activeLine, requestTopologyAuth, settleSelection, updateLine])

  const handleAddRoot = useCallback((option: HierarchyLevelOptionItem) => {
    if (!activeLine) {
      return
    }

    const updatedLine = addSegmentToLine(activeLine, option)
    const nextSegment = updatedLine.segments[updatedLine.segments.length - 1]
    const nextSelectedId = nextSegment?.id ? `segment-${nextSegment.id}` : null
    submitTopologyMutation(updatedLine, nextSelectedId)
  }, [activeLine, submitTopologyMutation])

  const handleAddChild = useCallback((parentId: string, option: HierarchyLevelOptionItem) => {
    if (!activeLine || !selectedNode || selectedNode.sourceType !== 'segment') {
      return
    }

    const segmentId = selectedNode.sourceId
    if (!segmentId) {
      return
    }

    const updatedLine = addJobCategoryToLine(activeLine, segmentId, option)
    const updatedSegment = updatedLine.segments.find((segment) => segment.id === segmentId)
    const nextJobCategory = updatedSegment?.jobCategories?.[updatedSegment.jobCategories.length - 1]
    const nextSelectedId = nextJobCategory?.id
      ? `job-category-${nextJobCategory.id}`
      : parentId
    submitTopologyMutation(updatedLine, nextSelectedId)
  }, [activeLine, selectedNode, submitTopologyMutation])

  const handleRenameSelected = useCallback((name: string) => {
    if (!activeLine || !selectedNode) {
      return
    }

    if (selectedNode.sourceType === 'segment') {
      const segmentId = selectedNode.sourceId
      if (!segmentId) {
        return
      }

      const updatedLine = renameSegmentInLine(activeLine, segmentId, name)
      submitTopologyMutation(updatedLine, selectedNode.id)
      return
    }

    if (selectedNode.sourceType === 'jobCategory') {
      const jobCategoryId = selectedNode.sourceId
      if (!jobCategoryId) {
        return
      }

      const parentSegment = getParentSegmentForJobCategory(jobCategoryId)
      if (!parentSegment) {
        return
      }

      const updatedLine = renameJobCategoryInLine(activeLine, parentSegment.id, jobCategoryId, name)
      submitTopologyMutation(updatedLine, selectedNode.id)
    }
  }, [activeLine, getParentSegmentForJobCategory, selectedNode, submitTopologyMutation])

  const handleDeleteSelected = useCallback(() => {
    if (!activeLine || !selectedNode) {
      return
    }

    if (selectedNode.sourceType === 'segment') {
      const segmentId = selectedNode.sourceId
      if (!segmentId) {
        return
      }

      const currentIndex = activeLine.segments.findIndex((segment) => segment.id === segmentId)
      if (currentIndex < 0) {
        return
      }

      const updatedLine = removeSegmentFromLine(activeLine, segmentId)
      const nextSegment = updatedLine.segments[currentIndex] ?? updatedLine.segments[currentIndex - 1] ?? null
      const nextSelectedId = nextSegment ? `segment-${nextSegment.id}` : null
      submitTopologyMutation(updatedLine, nextSelectedId)
      return
    }

    if (selectedNode.sourceType === 'jobCategory') {
      const jobCategoryId = selectedNode.sourceId
      if (!jobCategoryId) {
        return
      }

      const parentSegment = getParentSegmentForJobCategory(jobCategoryId)
      if (!parentSegment) {
        return
      }

      const updatedLine = removeJobCategoryFromLine(activeLine, parentSegment.id, jobCategoryId)
      submitTopologyMutation(updatedLine, `segment-${parentSegment.id}`)
    }
  }, [activeLine, getParentSegmentForJobCategory, selectedNode, submitTopologyMutation])

  const handleRebindSelected = useCallback((option: HierarchyLevelOptionItem) => {
    if (!activeLine || !selectedNode) {
      return
    }

    if (selectedNode.sourceType === 'segment') {
      const segmentId = selectedNode.sourceId
      if (!segmentId) {
        return
      }

      const updatedLine = rebindSegmentInLine(activeLine, segmentId, option)
      submitTopologyMutation(updatedLine, selectedNode.id)
      return
    }

    if (selectedNode.sourceType === 'jobCategory') {
      const jobCategoryId = selectedNode.sourceId
      if (!jobCategoryId) {
        return
      }

      const parentSegment = getParentSegmentForJobCategory(jobCategoryId)
      if (!parentSegment) {
        return
      }

      const updatedLine = rebindJobCategoryInLine(activeLine, parentSegment.id, jobCategoryId, option)
      submitTopologyMutation(updatedLine, selectedNode.id)
    }
  }, [activeLine, getParentSegmentForJobCategory, selectedNode, submitTopologyMutation])

  return {
    handleAddChild,
    handleAddRoot,
    handleDeleteSelected,
    handleRebindSelected,
    handleRenameSelected,
  }
}
