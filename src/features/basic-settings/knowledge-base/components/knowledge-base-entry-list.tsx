import { useLanguage } from '@/context/language-provider'
import type { KnowledgeBaseEntry } from '../data/knowledge-base'
import { KnowledgeBaseEntryCard } from './knowledge-base-entry-card'

interface KnowledgeBaseEntryListProps {
  entries: KnowledgeBaseEntry[]
  isLoading: boolean
  onEdit: (entry: KnowledgeBaseEntry) => void
  onDelete: (entryId: string) => void
}

export function KnowledgeBaseEntryList({
  entries,
  isLoading,
  onEdit,
  onDelete,
}: KnowledgeBaseEntryListProps) {
  const { t } = useLanguage()

  if (entries.length === 0) {
    return (
      <div className='rounded-2xl border border-dashed border-muted/60 bg-background p-8 text-center text-[12px] font-bold text-muted-foreground'>
        {isLoading
          ? t('basicSettings.knowledgeBase.page.loading')
          : t('basicSettings.knowledgeBase.page.empty')}
      </div>
    )
  }

  return (
    <div className='grid gap-2'>
      {entries.map((entry) => (
        <KnowledgeBaseEntryCard
          key={entry.id}
          entry={entry}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
