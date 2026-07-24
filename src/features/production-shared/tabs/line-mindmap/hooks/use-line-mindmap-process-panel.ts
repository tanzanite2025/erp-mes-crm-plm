import { useMemo } from 'react'
import type { ProductionLine } from '../../../data/production-line'
import type { ProductionProcessStep } from '../../../data/production-process'
import { useProductionProcessesQuery } from '../../../hooks/use-production-resources'
import {
  addProcessToLineSegment,
  removeProcessFromLineSegment,
} from '../../../topology/line-topology-helpers'
import type { LineMindmapNode } from '../data/line-mindmap-domain'
import type { LineMindmapProcessDraft } from '../types'
import { useLineMindmapProcessLibrary } from './use-line-mindmap-process-library'

interface UseLineMindmapProcessPanelOptions {
  activeLine: ProductionLine | null
  selectedNode: LineMindmapNode | null
  submitTopologyMutation: (
    updatedLine: ProductionLine,
    nextSelectedNodeId: string | null
  ) => Promise<void>
}

export function useLineMindmapProcessPanel({
  activeLine,
  selectedNode,
  submitTopologyMutation,
}: UseLineMindmapProcessPanelOptions) {
  const { data: processLibrary = [] } = useProductionProcessesQuery()
  const { deleteProcess, saveProcess } = useLineMindmapProcessLibrary()

  const saveProcessFromDraft = async (draft: LineMindmapProcessDraft) => {
    return saveProcess({
      id: '',
      description: draft.description || undefined,
      isActive: draft.isActive,
      name: draft.name.trim(),
    })
  }

  const processOptions = useMemo(() => {
    if (selectedNode?.sourceType !== 'segment') {
      return []
    }

    const mappedIds = new Set(
      (selectedNode.children || [])
        .map((child) => child.sourceId)
        .filter(Boolean)
    )
    return processLibrary
      .filter((process) => !mappedIds.has(process.id))
      .map((process) => ({
        id: process.id,
        label: process.name,
        code: process.code,
      }))
  }, [processLibrary, selectedNode])

  const handleAssignProcess = async (processId: string) => {
    if (
      !activeLine ||
      selectedNode?.sourceType !== 'segment' ||
      !selectedNode.sourceId
    ) {
      return
    }

    const process = processLibrary.find((item) => item.id === processId)
    if (!process) {
      return
    }

    const updatedLine = addProcessToLineSegment(
      activeLine,
      selectedNode.sourceId,
      process
    )
    await submitTopologyMutation(updatedLine, selectedNode.id)
  }

  const handleRemoveProcess = async () => {
    if (
      !activeLine ||
      selectedNode?.sourceType !== 'process' ||
      !selectedNode.sourceId ||
      !selectedNode.parentId
    ) {
      return
    }

    const segmentId = selectedNode.parentId.replace('segment-', '')
    const updatedLine = removeProcessFromLineSegment(
      activeLine,
      segmentId,
      selectedNode.sourceId
    )
    await submitTopologyMutation(updatedLine, `segment-${segmentId}`)
  }

  const handleCreateProcessForSegment = async (
    draft: LineMindmapProcessDraft,
    segmentId: string
  ) => {
    if (!activeLine) {
      return null
    }

    const saved = await saveProcessFromDraft(draft)
    const updatedLine = addProcessToLineSegment(activeLine, segmentId, saved)
    await submitTopologyMutation(updatedLine, `process-${saved.id}`)
    return saved
  }

  const handleSaveProcessEntity = async (process: ProductionProcessStep) => {
    await saveProcess({
      ...process,
      code: process.code?.trim() || undefined,
      description: process.description?.trim() || undefined,
      name: process.name.trim(),
    })
  }

  const handleDeleteProcessEntity = async (process: ProductionProcessStep) => {
    await deleteProcess(process)
  }

  return {
    handleAssignProcess,
    handleCreateProcessForSegment,
    handleDeleteProcessEntity,
    handleRemoveProcess,
    handleSaveProcessEntity,
    processOptions,
  }
}
