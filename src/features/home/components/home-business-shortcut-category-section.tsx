import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
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
      className='space-y-3'
    >
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/8 text-primary'>
            <CategoryIcon aria-hidden='true' className='size-4' />
          </span>
          <div className='min-w-0'>
            <h2
              id={`home-${category.id}-title`}
              className='text-base font-semibold'
            >
              {category.title}
            </h2>
            <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>
              {category.description}
            </p>
          </div>
        </div>
        {hasMoreShortcuts && (
          <Button
            variant='ghost'
            size='sm'
            className='h-8 shrink-0 gap-1.5 text-xs text-muted-foreground'
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
      <ul
        id={shortcutsListId}
        className='grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4'
      >
        {visibleShortcuts.map((shortcut) => {
          const ShortcutIcon = shortcut.icon ?? LayoutGrid
          return (
            <li key={shortcut.url}>
              <Link
                to={shortcut.url}
                className='group flex h-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-3.5 transition-colors hover:border-primary/30 hover:bg-primary/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
              >
                <ShortcutIcon
                  aria-hidden='true'
                  className='size-4 shrink-0 text-muted-foreground group-hover:text-primary'
                />
                <span className='min-w-0 flex-1'>
                  <span className='block text-sm leading-snug font-medium'>
                    {shortcut.title}
                  </span>
                  <span className='mt-1 block text-xs leading-snug text-muted-foreground'>
                    {shortcut.domainTitle}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden='true'
                  className='size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary'
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
