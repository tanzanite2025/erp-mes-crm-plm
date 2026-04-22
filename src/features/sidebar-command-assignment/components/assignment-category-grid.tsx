import { FolderTree } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Checkbox } from '@/components/ui/checkbox'
import type { SidebarCommandCategoryDto } from '../services'

type AssignmentCategoryGridProps = {
  categories: SidebarCommandCategoryDto[]
  selectedCategorySet: Set<string>
  hasSelectedAccount: boolean
  onToggleCategory: (categoryId: string, checked: boolean) => void
}

export function AssignmentCategoryGrid({
  categories,
  selectedCategorySet,
  hasSelectedAccount,
  onToggleCategory,
}: AssignmentCategoryGridProps) {
  const { t } = useLanguage()

  return (
    <section className='rounded-[32px] border border-dashed border-muted/50 bg-background p-5 shadow-inner'>
      <div className='mb-4 flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-black tracking-tighter italic'>
            {t('sidebarCommandAssignment.categoryGrid.title')}
          </h2>
          <p className='mt-1 text-[9px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandAssignment.categoryGrid.description')}
          </p>
        </div>
        <FolderTree className='size-5 text-muted-foreground' />
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
        {categories.map((category) => {
          const checked = selectedCategorySet.has(category.categoryId)

          return (
            <label
              key={category.categoryId}
              className={cn(
                'flex min-h-16 cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-3 transition-colors',
                checked
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-dashed border-muted/50 bg-muted/10 hover:border-muted/80'
              )}
            >
              <Checkbox
                checked={checked}
                disabled={!hasSelectedAccount}
                onCheckedChange={(value) =>
                  onToggleCategory(category.categoryId, value === true)
                }
                aria-label={`${t('sidebarCommandAssignment.categoryGrid.title')} ${category.name}`}
              />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-black tracking-tight'>
                  {category.name}
                </span>
                <span className='mt-1 block truncate font-mono text-[10px] font-black tracking-tight text-muted-foreground/50'>
                  {category.categoryId}
                </span>
              </span>
              <span className='shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-black text-muted-foreground tabular-nums'>
                {t('sidebarCommandAssignment.categoryGrid.commandCount', {
                  count: category.commandCount,
                })}
              </span>
            </label>
          )
        })}

        {categories.length === 0 ? (
          <div className='rounded-[24px] border border-dashed border-muted/50 bg-muted/5 px-4 py-10 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase md:col-span-2 xl:col-span-3'>
            {t('sidebarCommandAssignment.categoryGrid.empty')}
          </div>
        ) : null}
      </div>
    </section>
  )
}
