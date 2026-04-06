import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { Tabs } from '@/components/ui/tabs'
import { type Material } from '../../../material-archive/data/schema'
import { BOM_SECTIONS, BOM_SECTION_MATERIAL_TYPE_MAP } from '../../constants/bom-sections'
import { type BOM } from '../../data/schema'
import { ItemTable } from './item-table'
import { SummaryPanel } from './summary-panel'

interface BOMRecipeEditorProps {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  materials: Material[]
  append: (obj: BOM['items'][number]) => void
  remove: (index: number) => void
}

export function BOMRecipeEditor({ form, fields, materials, append, remove }: BOMRecipeEditorProps) {
  const { t } = useLanguage()
  const sections = [...BOM_SECTIONS]
  const [activeTab, setActiveTab] = useState<string>('all')

  const handleAppend = (section: string) => {
    append({
      id: '',
      section,
      materialId: '',
      materialName: '',
      materialSpec: '',
      unitPrice: 0,
      unit: '',
      unitUsage: 0,
      wastagePercent: 0,
      standardUsage: 0,
      materialType:
        BOM_SECTION_MATERIAL_TYPE_MAP[section] || t('engineering.bomArchive.category.defaultType'),
      supplyChannel: '',
      substitutes: [],
    })
  }

  const renderFields = fields
    .map((field, index) => ({ field, index }))
    .filter(({ index }) => {
      const currentSection = form.watch(`items.${index}.section`)
      return activeTab === 'all' || currentSection === activeTab
    })

  return (
    <div className='space-y-3 p-1'>
      <div className='mb-2 flex items-center justify-between border-b-2 border-dashed border-muted/50 pb-2'>
        <h4 className='text-[10px] font-black uppercase tracking-widest italic text-slate-900 sm:text-[12px]'>
          {t('engineering.bomArchive.recipe.title')}
        </h4>
      </div>

      <div className='mb-2'>
        <SegmentedTabs
          tabs={[
            { value: 'all', label: t('engineering.bomArchive.recipe.all') },
            ...sections.map((section) => ({ value: section, label: section })),
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full overflow-hidden'
          listClassName='flex h-10 w-full shrink-0 overflow-x-auto rounded-2xl bg-muted/20 p-1 scrollbar-none sm:grid sm:h-9 sm:grid-cols-8'
        />
      </div>

      <Tabs value={activeTab} className='min-h-0 w-full flex-1'>
        <div className='relative mt-2 flex h-[400px] flex-col overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-inner transition-all sm:h-[500px]'>
          <div className='custom-scrollbar flex-1 overflow-y-auto p-0'>
            {activeTab === 'all' ? (
              <SummaryPanel
                fields={fields}
                form={form}
                sections={sections}
                onSectionClick={(section) => setActiveTab(section)}
              />
            ) : (
              <ItemTable
                form={form}
                renderFields={renderFields}
                materials={materials}
                onRemove={(index) => remove(index)}
                onAdd={() => handleAppend(activeTab)}
              />
            )}
          </div>
        </div>
      </Tabs>
    </div>
  )
}
