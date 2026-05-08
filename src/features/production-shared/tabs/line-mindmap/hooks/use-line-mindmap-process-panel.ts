import { useMemo } from 'react'
import { useProductionProcessesQuery } from '../../../hooks/use-production-resources'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode } from '../data/sample-mindmap'
import type { LineMindmapProcessDraft } from '../types'
import { useLineMindmapProcessCapabilities } from './use-line-mindmap-process-capabilities'
import { useLineMindmapProcessLibrary } from './use-line-mindmap-process-library'

export function useLineMindmapProcessPanel(selectedNode: LineMindmapNode | null) {
  const { data: processLibrary = [] } = useProductionProcessesQuery()
  const { assignProcessCapability, removeProcessCapability } = useLineMindmapProcessCapabilities()
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
    if (selectedNode?.sourceType !== 'jobCategory') {
      return []
    }

    const mappedIds = new Set((selectedNode.children || []).map((child) => child.sourceId).filter(Boolean))
    return processLibrary
      .filter((process) => !mappedIds.has(process.id))
      .map((process) => ({
        id: process.id,
        label: process.name,
        code: process.code,
      }))
  }, [processLibrary, selectedNode])

  const handleAssignProcess = async (processId: string) => {
    if (selectedNode?.sourceType !== 'jobCategory' || !selectedNode.sourceId) {
      return
    }

    await assignProcessCapability(selectedNode.sourceId, processId)
  }

  const handleRemoveProcess = async () => {
    if (selectedNode?.sourceType !== 'process' || !selectedNode.sourceId || !selectedNode.parentId) {
      return
    }

    const jobCategoryId = selectedNode.parentId.replace('job-category-', '')
    await removeProcessCapability(jobCategoryId, selectedNode.sourceId)
  }

  const handleCreateProcessForJobCategory = async (draft: LineMindmapProcessDraft, jobCategoryId: string) => {
    const saved = await saveProcessFromDraft(draft)
    await assignProcessCapability(jobCategoryId, saved.id)
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
    handleCreateProcessForJobCategory,
    handleDeleteProcessEntity,
    handleRemoveProcess,
    handleSaveProcessEntity,
    processOptions,
  }
}
