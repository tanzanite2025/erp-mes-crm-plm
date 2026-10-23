import type { UseFormReturn } from 'react-hook-form'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'
import { type BOMWorkspaceParentChildrenProtocolDraft } from '../../hooks/bom-workspace-source-model'
import { type BOMPermissionGuard } from '../../hooks/use-bom-permission-guard'
import { useBOMWorkspace } from '../../hooks/use-bom-workspace'
import { BOMRecipeSummaryAndSectionAccordionEditor } from './bom-recipe-summary-and-section-accordion-editor'

interface BOMWorkspaceProps {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  materials: MaterialOption[]
  sections: BOMSectionOption[]
  append: (obj: BOM['items'][number]) => void
  remove: (index: number) => void
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
  permissionGuard?: BOMPermissionGuard
}

export function BOMWorkspace({
  form,
  fields,
  materials,
  sections,
  append,
  remove,
  protocolDraft,
  permissionGuard,
}: BOMWorkspaceProps) {
  const workspace = useBOMWorkspace({
    form,
    fields,
    sections,
    append,
    protocolDraft,
    permissionGuard,
  })

  // Wrap remove with permission guard if provided
  const guardedRemove = permissionGuard?.guardedRemove(remove) ?? remove

  return (
    <BOMRecipeSummaryAndSectionAccordionEditor
      form={form}
      materials={materials}
      onRemove={guardedRemove}
      groups={workspace.groups}
      nodes={workspace.visibleTreeNodes}
      onBranchToggle={workspace.toggleBranchExpanded}
      onAddItem={workspace.appendItem}
      canEdit={workspace.canEdit}
    />
  )
}
