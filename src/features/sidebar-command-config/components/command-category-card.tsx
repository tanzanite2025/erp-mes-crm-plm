import { Pencil, Power } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SidebarCommandCategoryDto } from '../api/shared'

type CommandCategoryCardProps = {
  category: SidebarCommandCategoryDto
  isSaving: boolean
  onEdit: (category: SidebarCommandCategoryDto) => void
  onToggleEnabled: (category: SidebarCommandCategoryDto) => void
}

export function CommandCategoryCard({
  category,
  isSaving,
  onEdit,
  onToggleEnabled,
}: CommandCategoryCardProps) {
  const { t } = useLanguage()
  const isAvailable = category.enabled && category.status !== 'disabled'

  return (
    <div
      className={cn(
        'rounded-[18px] border border-dashed border-muted/50 bg-background p-4 shadow-sm transition-colors',
        isAvailable ? 'hover:border-primary/30' : 'opacity-70'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <h3 className='truncate text-sm font-black tracking-tight'>
            {category.name}
          </h3>
          <p className='mt-1 truncate font-mono text-[10px] font-black tracking-tight text-muted-foreground/50'>
            {category.categoryId}
          </p>
        </div>
        <Badge
          variant={category.enabled ? 'default' : 'secondary'}
          className='shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black tracking-widest'
        >
          {category.enabled
            ? t('sidebarCommandAssignment.categoryCard.enabled')
            : t('sidebarCommandAssignment.categoryCard.disabled')}
        </Badge>
      </div>

      <p className='mt-2 line-clamp-2 min-h-8 text-[11px] leading-4 font-medium text-muted-foreground/75'>
        {category.description ||
          t('sidebarCommandAssignment.categoryCard.noDescription')}
      </p>

      <div className='mt-3 flex items-center justify-between gap-2 rounded-xl bg-muted/25 px-3 py-2'>
        <span className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
          {t('sidebarCommandAssignment.categoryCard.commandCount')}
        </span>
        <span className='text-sm font-black tabular-nums'>
          {category.commandCount}
        </span>
      </div>

      <div className='mt-3 flex flex-wrap justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-7 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest'
          disabled={isSaving}
          onClick={() => onEdit(category)}
        >
          <Pencil className='size-3.5' />
          {t('sidebarCommandAssignment.categoryCard.edit')}
        </Button>
        <Button
          type='button'
          variant={category.enabled ? 'outline' : 'default'}
          size='sm'
          className='h-7 rounded-full px-3 text-[10px] font-black tracking-widest'
          disabled={isSaving}
          onClick={() => onToggleEnabled(category)}
        >
          <Power className='size-3.5' />
          {category.enabled
            ? t('sidebarCommandAssignment.categoryCard.disabled')
            : t('sidebarCommandAssignment.categoryCard.enabled')}
        </Button>
      </div>
    </div>
  )
}
