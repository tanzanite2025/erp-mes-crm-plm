import type { UseFormReturn } from 'react-hook-form'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'
import { useBOMWorkspace } from '../../hooks/use-bom-workspace'
import { BOMRecipeEditor } from './bom-recipe-editor'

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
    <BOMRecipeEditor
      form={form}
      fields={fields}
      materials={materials}
      remove={remove}
      activeSections={workspace.activeSections}
      activeTab={workspace.activeTab}
      onActiveTabChange={workspace.setActiveTab}
      renderFields={workspace.renderFields}
      onAddItem={() => workspace.appendItem()}
    />
  )
}
