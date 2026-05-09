import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { Tabs } from '@/components/ui/tabs'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'
import { ItemTable } from './item-table'
import { SummaryPanel } from './summary-panel'

interface BOMRecipeEditorProps {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  materials: MaterialOption[]
  remove: (index: number) => void
  activeSections: BOMSectionOption[]
  activeTab: string
  onActiveTabChange: (value: string) => void
  renderFields: Array<{ field: { id: string }; index: number }>
  onAddItem: () => void
}

export function BOMRecipeEditor({
  form,
  fields,
  materials,
  remove,
  activeSections,
  activeTab,
  onActiveTabChange,
  renderFields,
  onAddItem,
}: BOMRecipeEditorProps) {
  const { t } = useLanguage()

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-2 p-0.5'>
      <div className='mb-1.5 flex items-center justify-between border-b-2 border-dashed border-muted/50 pb-1.5'>
        <h4 className='text-[10px] font-black uppercase tracking-widest italic text-slate-900 sm:text-[12px]'>
          {t('engineering.bomArchive.recipe.title')}
        </h4>
      </div>

      <div className='mb-1.5'>
        <SegmentedTabs
          tabs={[
            { value: 'all', label: t('engineering.bomArchive.recipe.all') },
            ...activeSections.map((section) => ({ value: section.code, label: section.name })),
          ]}
          value={activeTab}
          onValueChange={onActiveTabChange}
          className='w-full overflow-hidden'
          listClassName='h-11 shrink-0 rounded-2xl bg-muted/20 p-0 px-1 sm:grid sm:h-10 sm:grid-cols-8'
        />
      </div>

      <Tabs value={activeTab} className='flex min-h-0 w-full flex-1 flex-col'>
        <div className='relative mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-inner'>
          {activeTab === 'all' ? (
            <div className='custom-scrollbar flex-1 overflow-y-auto p-0'>
              <SummaryPanel
                fields={fields}
                form={form}
                sections={activeSections}
                onSectionClick={(section) => onActiveTabChange(section)}
              />
            </div>
          ) : (
            <ItemTable
              form={form}
              renderFields={renderFields}
              materials={materials}
              onRemove={(index) => remove(index)}
              onAdd={onAddItem}
            />
          )}
        </div>
      </Tabs>
    </div>
  )
}
