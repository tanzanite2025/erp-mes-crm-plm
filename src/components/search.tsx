import { SearchIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useSearch } from '@/context/search-provider'
import { Button } from './ui/button'

export function Search({
  className = '',
}: { className?: string }) {
  const { setOpen } = useSearch()
  const { t } = useLanguage()
  return (
    <Button
      variant='outline'
      className={cn(
        'group relative h-9 w-9 p-0 justify-center rounded-full bg-muted/10 text-xs font-bold text-muted-foreground/50 shadow-none hover:bg-muted/20 hover:text-foreground transition-all border-dashed border-muted-foreground/20 sm:w-64 sm:justify-start sm:px-3 md:flex-none lg:w-80 xl:w-96',
        className
      )}
      onClick={() => setOpen(true)}
    >
      <SearchIcon
        aria-hidden='true'
        className='sm:absolute sm:start-3 sm:top-1/2 sm:-translate-y-1/2 shrink-0'
        size={14}
      />
      <span className='ms-6 uppercase tracking-widest hidden sm:inline-block'>{t('search.globalPlaceholder')}</span>
    </Button>
  )
}
