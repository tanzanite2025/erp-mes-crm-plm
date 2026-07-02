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
import {
  findMindmapNode,
  type LineMindmapNode,
} from '../data/line-mindmap-domain'
import type { PendingTopologyMutation } from './use-line-mindmap-topology-auth'

interface UseLineMindmapActionsOptions {
  activeLine: ProductionLine | null
  nodes: LineMindmapNode[]
  requestTopologyAuth: (mutation: PendingTopologyMutation) => void
  selectedNode: LineMindmapNode | null
  settleSelection: (nextSelectedNodeId: string | null) => void
  updateLineStrict: (
    payload: LineMutationPayload,
    authCode?: string
  ) => Promise<void>
}

export function useLineMindmapActions({
  activeLine,
  nodes,
  requestTopologyAuth,
  selectedNode,
  settleSelection,
  updateLineStrict,
}: UseLineMindmapActionsOptions) {
  const getParentSegmentForJobCategory = useCallback(
    (jobCategoryId: string) => {
      if (!activeLine) {
        return null
      }

      return (
        activeLine.segments.find((segment) =>
          (segment.jobCategories || []).some(
            (jobCategory) => jobCategory.id === jobCategoryId
          )
        ) ?? null
      )
    },
    [activeLine]
  )

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

  const handleAddRoot = useCallback(
    async (option: HierarchyLevelOptionItem) => {
      if (!activeLine) {
        return
      }

      const updatedLine = addSegmentToLine(activeLine, option)
      const nextSegment = updatedLine.segments[updatedLine.segments.length - 1]
      const nextSelectedId = nextSegment?.id
        ? `segment-${nextSegment.id}`
        : null
      await submitTopologyMutation(updatedLine, nextSelectedId)
    },
    [activeLine, submitTopologyMutation]
  )

  const handleAddChild = useCallback(
    async (parentId: string, option: HierarchyLevelOptionItem) => {
      if (!activeLine) {
        return
      }

      const parentNode =
        selectedNode?.id === parentId
          ? selectedNode
          : findMindmapNode(nodes, parentId)

      if (!parentNode || parentNode.sourceType !== 'segment') {
        return
      }

      const segmentId = parentNode.sourceId
      if (!segmentId) {
        return
      }

      const updatedLine = addJobCategoryToLine(activeLine, segmentId, option)
      const updatedSegment = updatedLine.segments.find(
        (segment) => segment.id === segmentId
      )
      const nextJobCategory =
        updatedSegment?.jobCategories?.[updatedSegment.jobCategories.length - 1]
      const nextSelectedId = nextJobCategory?.id
        ? `job-category-${nextJobCategory.id}`
        : parentId
      await submitTopologyMutation(updatedLine, nextSelectedId)
    },
    [activeLine, nodes, selectedNode, submitTopologyMutation]
  )

  const handleRenameSelected = useCallback(
    async (name: string) => {
      if (!activeLine || !selectedNode) {
        return
      }

      if (selectedNode.sourceType === 'segment') {
        const segmentId = selectedNode.sourceId
        if (!segmentId) {
          return
        }

        const updatedLine = renameSegmentInLine(activeLine, segmentId, name)
        await submitTopologyMutation(updatedLine, selectedNode.id)
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

        const updatedLine = renameJobCategoryInLine(
          activeLine,
          parentSegment.id,
          jobCategoryId,
          name
        )
        await submitTopologyMutation(updatedLine, selectedNode.id)
      }
    },
    [
      activeLine,
      getParentSegmentForJobCategory,
      selectedNode,
      submitTopologyMutation,
    ]
  )

  const handleDeleteSelected = useCallback(async () => {
    if (!activeLine || !selectedNode) {
      return
    }

    if (selectedNode.sourceType === 'segment') {
      const segmentId = selectedNode.sourceId
      if (!segmentId) {
        return
      }

      const currentIndex = activeLine.segments.findIndex(
        (segment) => segment.id === segmentId
      )
      if (currentIndex < 0) {
        return
      }

      const updatedLine = removeSegmentFromLine(activeLine, segmentId)
      const nextSegment =
        updatedLine.segments[currentIndex] ??
        updatedLine.segments[currentIndex - 1] ??
        null
      const nextSelectedId = nextSegment ? `segment-${nextSegment.id}` : null
      await submitTopologyMutation(updatedLine, nextSelectedId)
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

      const updatedLine = removeJobCategoryFromLine(
        activeLine,
        parentSegment.id,
        jobCategoryId
      )
      await submitTopologyMutation(updatedLine, `segment-${parentSegment.id}`)
    }
  }, [
    activeLine,
    getParentSegmentForJobCategory,
    selectedNode,
    submitTopologyMutation,
  ])

  const handleRebindSelected = useCallback(
    async (option: HierarchyLevelOptionItem) => {
      if (!activeLine || !selectedNode) {
        return
      }

      if (selectedNode.sourceType === 'segment') {
        const segmentId = selectedNode.sourceId
        if (!segmentId) {
          return
        }

        const updatedLine = rebindSegmentInLine(activeLine, segmentId, option)
        await submitTopologyMutation(updatedLine, selectedNode.id)
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

        const updatedLine = rebindJobCategoryInLine(
          activeLine,
          parentSegment.id,
          jobCategoryId,
          option
        )
        await submitTopologyMutation(updatedLine, selectedNode.id)
      }
    },
    [
      activeLine,
      getParentSegmentForJobCategory,
      selectedNode,
      submitTopologyMutation,
    ]
  )

  return {
    handleAddChild,
    handleAddRoot,
    handleDeleteSelected,
    handleRebindSelected,
    handleRenameSelected,
  }
}
