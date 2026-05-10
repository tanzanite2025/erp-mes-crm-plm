import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { createEmptyBOMItem } from '../utils/bom-form-defaults'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-source-model'
import { useBOMWorkspaceProjection } from './use-bom-workspace-projection'

interface UseBOMWorkspaceParams {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  sections: BOMSectionOption[]
  append: (obj: BOM['items'][number]) => void
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function useBOMWorkspace({ form, fields, sections, append, protocolDraft }: UseBOMWorkspaceParams) {
  const [activeGroupKey, setActiveGroupKey] = useState<string>('all')
  const [expandedBranchKeys, setExpandedBranchKeys] = useState<string[]>([])
  const projection = useBOMWorkspaceProjection({
    form,
    fields,
    sections,
    activeGroupKey,
    expandedBranchKeys,
    protocolDraft,
  })

  const collectDescendantBranchNodeIds = (sourceBranchNodeId: string): string[] => {
    const sourceNode = projection.sourceModel.nodeById.get(sourceBranchNodeId)
    if (!sourceNode || sourceNode.nodeKind !== 'branch') {
      return []
    }

    return sourceNode.childNodeIds.flatMap((childNodeId) => {
      const childNode = projection.sourceModel.nodeById.get(childNodeId)
      if (!childNode || childNode.nodeKind !== 'branch') {
        return []
      }

      return [childNode.nodeId, ...collectDescendantBranchNodeIds(childNode.nodeId)]
    })
  }

  const handleActiveGroupChange = (nextGroupKey: string) => {
    setActiveGroupKey(nextGroupKey)

    if (nextGroupKey === 'all') {
      return
    }

    const nextGroup = projection.groups.find((group) => group.key === nextGroupKey)
    if (!nextGroup) {
      return
    }

    const nextExpandedBranchNodeIds = [
      nextGroup.sourceNodeId,
      ...collectDescendantBranchNodeIds(nextGroup.sourceNodeId),
    ]

    setExpandedBranchKeys((current) =>
      Array.from(new Set([...current, ...nextExpandedBranchNodeIds]))
    )
  }

  const toggleBranchExpanded = (sourceBranchNodeId: string) => {
    setExpandedBranchKeys((current) =>
      current.includes(sourceBranchNodeId)
        ? current.filter((key) => key !== sourceBranchNodeId)
        : [...current, sourceBranchNodeId]
    )
  }

  const appendItem = (sectionCode?: string) => {
    const resolvedSectionCode = sectionCode || projection.appendContext.sectionCode

    append(createEmptyBOMItem(resolvedSectionCode))
  }

  return {
    activeSections: projection.activeSections,
    sourceModel: projection.sourceModel,
    groups: projection.groups,
    groupNodes: projection.groupNodes,
    activeGroupKey: projection.resolvedActiveGroupKey,
    setActiveGroupKey: handleActiveGroupChange,
    expandedBranchKeys,
    toggleBranchExpanded,
    activeGroup: projection.activeGroup,
    viewMode: projection.viewMode,
    visibleNodes: projection.visibleNodes,
    visibleTreeNodes: projection.visibleTreeNodes,
    visibleLeafRows: projection.visibleLeafRows,
    appendContext: projection.appendContext,
    appendItem,
  }
}
