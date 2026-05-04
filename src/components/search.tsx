import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

type SearchProps = {
  className?: string
  placement?: 'header' | 'dock'
}

export function Search({
  className = '',
  placement = 'header',
}: SearchProps) {
  const { setOpen } = useSearch()
  const { t } = useLanguage()
  const isDock = placement === 'dock'

  return (
    <Button
      variant='outline'
      aria-label={t('search.globalPlaceholder')}
      className={cn(
        'group relative rounded-full text-xs font-bold shadow-none transition-all',
        isDock
          ? 'size-11 border-primary/20 bg-primary/95 p-0 text-primary-foreground shadow-xl shadow-primary/15 hover:scale-105 hover:bg-primary hover:text-primary-foreground active:scale-95 dark:bg-primary/10 dark:text-primary dark:border-primary/30 dark:shadow-primary/5 dark:hover:bg-primary dark:hover:text-primary-foreground'
          : 'h-9 w-9 justify-center border-dashed border-muted-foreground/20 bg-muted/10 p-0 text-muted-foreground/50 hover:bg-muted/20 hover:text-foreground md:w-44 md:flex-none md:justify-start md:px-3 lg:w-48 xl:w-52',
        className
      )}
      onClick={() => setOpen(true)}
    >
      <SearchIcon
        aria-hidden='true'
        className={cn(
          'shrink-0',
          isDock ? 'size-4' : 'md:absolute md:start-3 md:top-1/2 md:-translate-y-1/2'
        )}
        size={14}
      />
      {!isDock && (
        <span className='ms-6 hidden truncate uppercase tracking-widest md:inline-block'>
          {t('search.globalPlaceholder')}
        </span>
      )}
    </Button>
  )
}
