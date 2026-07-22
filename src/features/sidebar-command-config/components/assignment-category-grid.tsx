import { FolderTree } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Checkbox } from '@/components/ui/checkbox'
import type { SidebarCommandCategoryDto } from '../api/shared'

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
    <section className='rounded-2xl border border-dashed border-muted/50 bg-background px-3 py-2.5 shadow-inner'>
      <div className='mb-1.5 flex items-center justify-between gap-3'>
        <div>
          <h2 className='text-[13px] font-black tracking-tighter italic'>
            {t('sidebarCommandConfig.categoryGrid.title')}
          </h2>
          <p className='mt-0.5 text-[8px] font-black tracking-widest text-muted-foreground/55 uppercase'>
            {t('sidebarCommandConfig.categoryGrid.description')}
          </p>
        </div>
        <FolderTree className='size-4 text-muted-foreground' />
      </div>

      <div className='grid gap-1.5 md:grid-cols-2 xl:grid-cols-3'>
        {categories.map((category) => {
          const checked = selectedCategorySet.has(category.categoryId)

          return (
            <label
              key={category.categoryId}
              className={cn(
                'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors',
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
                aria-label={`${t('sidebarCommandConfig.categoryGrid.title')} ${category.name}`}
              />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-[13px] font-black tracking-tight'>
                  {category.name}
                </span>
                <span className='block truncate font-mono text-[8px] font-black tracking-tight text-muted-foreground/50'>
                  {category.categoryId}
                </span>
              </span>
              <span className='shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-black text-muted-foreground tabular-nums'>
                {t('sidebarCommandConfig.categoryGrid.commandCount', {
                  count: category.commandCount,
                })}
              </span>
            </label>
          )
        })}

        {categories.length === 0 ? (
          <div className='rounded-xl border border-dashed border-muted/50 bg-muted/5 px-4 py-5 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase md:col-span-2 xl:col-span-3'>
            {t('sidebarCommandConfig.categoryGrid.empty')}
          </div>
        ) : null}
      </div>
    </section>
  )
}
