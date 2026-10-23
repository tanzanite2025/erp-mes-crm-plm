import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ProductCreationOperationGuideLauncher } from '@/features/engineering/components/product-creation-guide/product-creation-operation-guide-launcher'
import type { HomeBusinessShortcutCategory } from '../data/build-home-business-shortcut-categories'

const HOME_CATEGORY_PREVIEW_SHORTCUT_COUNT = 4

export function HomeBusinessShortcutCategorySection({
  category,
}: {
  category: HomeBusinessShortcutCategory
}) {
  const { t } = useLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const CategoryIcon = category.icon ?? LayoutGrid
  const visibleShortcuts = isExpanded
    ? category.shortcuts
    : category.shortcuts.slice(0, HOME_CATEGORY_PREVIEW_SHORTCUT_COUNT)
  const hasMoreShortcuts =
    category.shortcuts.length > HOME_CATEGORY_PREVIEW_SHORTCUT_COUNT
  const shortcutsListId = `home-${category.id}-shortcuts`

  return (
    <section
      aria-labelledby={`home-${category.id}-title`}
      className='min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground'
    >
      <div className='border-b border-border/60 bg-muted/30 p-4'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <span className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary'>
              <CategoryIcon aria-hidden='true' className='size-4' />
            </span>
            <h2
              id={`home-${category.id}-title`}
              className='min-w-0 text-base font-semibold break-words'
            >
              {category.title}
            </h2>
          </div>
          {hasMoreShortcuts && (
            <Button
              variant='ghost'
              size='sm'
              className='h-7 shrink-0 gap-1 text-xs text-muted-foreground'
              aria-expanded={isExpanded}
              aria-controls={shortcutsListId}
              onClick={() => setIsExpanded((expanded) => !expanded)}
            >
              {t(isExpanded ? 'home.showLess' : 'home.showMore')}
              <span className='text-muted-foreground/70'>
                {t('home.entryCount', { count: category.shortcuts.length })}
              </span>
              {isExpanded ? (
                <ChevronUp aria-hidden='true' className='size-3.5' />
              ) : (
                <ChevronDown aria-hidden='true' className='size-3.5' />
              )}
            </Button>
          )}
        </div>
        {category.description && (
          <p className='mt-2 text-xs leading-relaxed text-muted-foreground'>
            {category.description}
          </p>
        )}
      </div>
      <ul id={shortcutsListId} className='space-y-0.5 p-2'>
        {visibleShortcuts.map((shortcut) => {
          const ShortcutIcon = shortcut.icon ?? LayoutGrid
          const ShortcutLink =
            shortcut.url === '/engineering/product-creation-guide'
              ? ProductCreationOperationGuideLauncher
              : Link
          return (
            <li key={shortcut.url}>
              <ShortcutLink
                to={shortcut.url}
                className='group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              >
                <ShortcutIcon
                  aria-hidden='true'
                  className='size-4 shrink-0 text-muted-foreground group-hover:text-primary'
                />
                <span className='min-w-0 flex-1'>
                  <span className='block text-sm leading-snug font-medium break-words'>
                    {shortcut.title}
                  </span>
                  <span className='mt-0.5 block text-xs leading-relaxed break-words text-muted-foreground'>
                    {shortcut.description ?? shortcut.domainTitle}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden='true'
                  className='size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary'
                />
              </ShortcutLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
