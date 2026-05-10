import type { UseFormReturn } from 'react-hook-form'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'
import { useBOMWorkspace } from '../../hooks/use-bom-workspace'
import { BOMFlatWorkspaceView } from './bom-flat-workspace-view'

interface BOMWorkspaceProps {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  materials: MaterialOption[]
  sections: BOMSectionOption[]
  append: (obj: BOM['items'][number]) => void
  remove: (index: number) => void
}

export function BOMWorkspace({ form, fields, materials, sections, append, remove }: BOMWorkspaceProps) {
  const workspace = useBOMWorkspace({
    form,
    fields,
    sections,
    append,
  })

  return (
    <BOMFlatWorkspaceView
      form={form}
      materials={materials}
      remove={remove}
      groups={workspace.groups}
      groupNodes={workspace.groupNodes}
      activeGroupKey={workspace.activeGroupKey}
      onActiveGroupChange={workspace.setActiveGroupKey}
      viewMode={workspace.viewMode}
      visibleTreeNodes={workspace.visibleTreeNodes}
      onBranchToggle={workspace.toggleBranchExpanded}
      onAddItem={() => workspace.appendItem()}
    />
  )
}
