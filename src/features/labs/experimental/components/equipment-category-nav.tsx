import { Plus } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { type EquipmentCategory } from '../data/schema'

interface EquipmentCategoryNavProps {
  categories: EquipmentCategory[]
  activeCategoryId: string
  onCategoryChange: (id: string) => void
  onAddTopCategory: () => void
}

export function EquipmentCategoryNav({
  categories,
  activeCategoryId,
  onCategoryChange,
  onAddTopCategory,
}: EquipmentCategoryNavProps) {
  const { t } = useLanguage()
  const topLevelCategories = categories
    .filter((category) => !category.parentId)
    .sort((a, b) => (a.order || 0) - (b.order || 0))

  return (
    <div className='flex items-center justify-between rounded-[24px] border border-dashed border-muted/50 bg-muted/5 p-2 px-4 shadow-inner'>
      <SegmentedTabs
        tabs={topLevelCategories.map((category) => ({
          value: category.id,
          label: category.name,
        }))}
        value={activeCategoryId}
        onValueChange={onCategoryChange}
        listClassName='h-11 bg-transparent border-none'
      />

      <Button
        variant='ghost'
        size='sm'
        className='h-11 gap-1.5 rounded-xl px-4 text-[10px] font-black tracking-widest text-primary/60 uppercase transition-all hover:bg-primary/5 hover:text-primary'
        onClick={onAddTopCategory}
      >
        <Plus className='size-3.5' />
        {t('labExperimental.equipment.addTopCategory')}
      </Button>
    </div>
  )
}
