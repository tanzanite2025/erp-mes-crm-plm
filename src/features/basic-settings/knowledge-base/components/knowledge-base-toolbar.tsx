import { Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  KNOWLEDGE_BASE_CATEGORIES,
  type KnowledgeBaseCategory,
} from '../data/knowledge-base'

interface KnowledgeBaseToolbarProps {
  searchTerm: string
  categoryFilter: KnowledgeBaseCategory | 'all'
  onSearchChange: (value: string) => void
  onCategoryChange: (value: KnowledgeBaseCategory | 'all') => void
  onCreate: () => void
}

export function KnowledgeBaseToolbar({
  searchTerm,
  categoryFilter,
  onSearchChange,
  onCategoryChange,
  onCreate,
}: KnowledgeBaseToolbarProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-3 rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-3 lg:flex-row lg:items-center lg:justify-between'>
      <div className='flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center'>
        <div className='relative w-full lg:max-w-sm'>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t(
              'basicSettings.knowledgeBase.page.searchPlaceholder'
            )}
            className='h-9 rounded-xl border-none bg-background pl-9 text-[12px] font-bold shadow-sm focus-visible:ring-1 focus-visible:ring-primary/20'
          />
        </div>

        <div className='flex max-w-full gap-2 overflow-x-auto rounded-full border border-muted/50 bg-muted/40 p-1'>
          {KNOWLEDGE_BASE_CATEGORIES.map((category) => (
            <button
              key={category.value}
              type='button'
              onClick={() => onCategoryChange(category.value)}
              className={cn(
                'rounded-full px-3 py-1 text-[10px] font-black whitespace-nowrap transition-colors',
                categoryFilter === category.value
                  ? 'bg-background text-primary shadow-sm'
                  : 'text-muted-foreground/50 hover:text-foreground'
              )}
            >
              {t(category.labelKey as any)}
            </button>
          ))}
        </div>
      </div>

      <Button
        className='h-9 rounded-full px-4 text-[11px] font-black'
        onClick={onCreate}
      >
        <Plus className='mr-1.5 size-3.5' />
        {t('basicSettings.knowledgeBase.actions.create')}
      </Button>
    </div>
  )
}
