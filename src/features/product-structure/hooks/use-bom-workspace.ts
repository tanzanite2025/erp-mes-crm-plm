import { useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { createEmptyBOMItem } from '../utils/bom-form-defaults'
import { getActiveBOMSections, getDefaultBOMSectionCode } from '../utils/bom-section-utils'

interface UseBOMWorkspaceParams {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  sections: BOMSectionOption[]
  append: (obj: BOM['items'][number]) => void
}

export function useBOMWorkspace({ form, fields, sections, append }: UseBOMWorkspaceParams) {
  const activeSections = useMemo(() => getActiveBOMSections(sections), [sections])
  const [activeTab, setActiveTab] = useState<string>('all')
  const watchedItems = form.watch('items')

  const renderFields = useMemo(
    () =>
      fields
        .map((field, index) => ({ field, index }))
        .filter(({ index }) => {
          const currentSection = watchedItems?.[index]?.section
          return activeTab === 'all' || currentSection === activeTab
        }),
    [activeTab, fields, watchedItems]
  )

  const appendItem = (sectionCode?: string) => {
    const resolvedSectionCode = activeTab === 'all'
      ? sectionCode || getDefaultBOMSectionCode(sections)
      : activeTab

    append(createEmptyBOMItem(resolvedSectionCode))
  }

  return {
    activeSections,
    activeTab,
    setActiveTab,
    renderFields,
    appendItem,
  }
}
