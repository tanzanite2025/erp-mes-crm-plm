import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { createEmptyBOMItem } from '../utils/bom-form-defaults'
import {
  getDefaultBOMSectionCode,
  resolveBOMSection,
} from '../utils/bom-section-utils'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-branch-relation'
import { type BOMPermissionGuard } from './use-bom-permission-guard'
import { useBOMWorkspaceProjection } from './use-bom-workspace-projection'

interface UseBOMWorkspaceParams {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  sections: BOMSectionOption[]
  append: (obj: BOM['items'][number]) => void
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
  permissionGuard?: BOMPermissionGuard
}

export function useBOMWorkspace({
  form,
  fields,
  sections,
  append,
  protocolDraft,
  permissionGuard,
}: UseBOMWorkspaceParams) {
  const [branchExpansionOverrides, setBranchExpansionOverrides] = useState(
    () => new Map<string, boolean>()
  )
  const projection = useBOMWorkspaceProjection({
    form,
    fields,
    sections,
    branchExpansionOverrides,
    protocolDraft,
  })

  // Wrap append with permission guard if provided
  const guardedAppend = permissionGuard?.guardedAppend(append) ?? append

  function toggleBOMRecipeBranchExpansion(sourceBranchNodeId: string) {
    const branch = projection.branchNodes.find(
      (node) => node.sourceNodeId === sourceBranchNodeId
    )
    if (!branch) return
    setBranchExpansionOverrides((current) =>
      new Map(current).set(sourceBranchNodeId, !branch.isExpanded)
    )
  }

  function appendBOMRecipeItemToSelectedSection(sectionCode?: string) {
    const targetSectionCode = sectionCode || getDefaultBOMSectionCode(sections)
    if (!resolveBOMSection(sections, targetSectionCode)?.active) return
    guardedAppend(createEmptyBOMItem(targetSectionCode))
  }

  return {
    groups: projection.groups,
    toggleBranchExpanded: toggleBOMRecipeBranchExpansion,
    visibleTreeNodes: projection.visibleTreeNodes,
    appendItem: appendBOMRecipeItemToSelectedSection,
    canEdit: permissionGuard?.canEdit ?? true,
  }
}
