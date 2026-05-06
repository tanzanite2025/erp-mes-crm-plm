import { useMemo, useState } from 'react'
import { useProductionProcessesQuery } from '../../../hooks/use-production-resources'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode } from '../data/sample-mindmap'
import { useLineMindmapProcessCapabilities } from './use-line-mindmap-process-capabilities'
import { useLineMindmapProcessLibrary } from './use-line-mindmap-process-library'

interface ProcessLibraryDraft {
  description: string
  isActive: boolean
  name: string
}

const emptyProcessLibraryDraft: ProcessLibraryDraft = {
  description: '',
  isActive: true,
  name: '',
}

export function useLineMindmapProcessPanel(selectedNode: LineMindmapNode | null) {
  const { data: processLibrary = [] } = useProductionProcessesQuery()
  const { assignProcessCapability, removeProcessCapability } = useLineMindmapProcessCapabilities()
  const { deleteProcess, saveProcess } = useLineMindmapProcessLibrary()
  const [processLibraryDraft, setProcessLibraryDraft] = useState<ProcessLibraryDraft>(emptyProcessLibraryDraft)

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

  const handlePatchProcessLibraryDraft = (patch: Partial<ProcessLibraryDraft>) => {
    setProcessLibraryDraft((current) => ({ ...current, ...patch }))
  }

  const resetProcessLibraryDraft = () => {
    setProcessLibraryDraft(emptyProcessLibraryDraft)
  }

  const handleCreateProcess = async (draft: ProcessLibraryDraft) => {
    const saved = await saveProcess({
      id: '',
      description: draft.description || undefined,
      isActive: draft.isActive,
      name: draft.name.trim(),
    })
    resetProcessLibraryDraft()

    if (selectedNode?.sourceType === 'jobCategory' && selectedNode.sourceId) {
      await assignProcessCapability(selectedNode.sourceId, saved.id)
    }
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
    handleCreateProcess,
    handleDeleteProcessEntity,
    handlePatchProcessLibraryDraft,
    handleRemoveProcess,
    handleSaveProcessEntity,
    processLibraryDraft,
    processOptions,
  }
}
