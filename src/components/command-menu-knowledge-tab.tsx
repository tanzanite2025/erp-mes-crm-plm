import { BookOpenText } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import {
  getKnowledgeContentText,
  type KnowledgeBaseEntry,
} from '@/features/basic-settings/knowledge-base/data/knowledge-base'
import { getKnowledgeContentMediaFlags } from '@/features/basic-settings/knowledge-base/data/knowledge-content'
import { KnowledgeBaseCategoryBadge } from '@/features/basic-settings/knowledge-base/components/knowledge-base-category-badge'
import { KnowledgeBaseMediaIndicators } from '@/features/basic-settings/knowledge-base/components/knowledge-base-entry-card'
import {
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { TabsContent } from './ui/tabs'

interface CommandMenuKnowledgeTabProps {
  entries: KnowledgeBaseEntry[]
  onSelect: (entry: KnowledgeBaseEntry) => void
}

export function CommandMenuKnowledgeTab({
  entries,
  onSelect,
}: CommandMenuKnowledgeTabProps) {
  const { t } = useLanguage()

  return (
    <TabsContent value='knowledge' className='m-0 focus-visible:outline-none'>
      <div className='p-4'>
        {entries.length === 0 ? (
          <div className='space-y-3'>
            <div className='text-center text-[9px] font-black uppercase tracking-[0.2em] text-sky-600/70 italic'>
              {t('commandMenu.headings.knowledgeBase')}
            </div>
            <div className='flex min-h-36 items-center justify-center rounded-2xl border border-dashed border-muted/60 bg-muted/10 px-4 py-12 text-center text-[12px] font-bold text-muted-foreground'>
              {t('basicSettings.knowledgeBase.page.empty')}
            </div>
          </div>
        ) : (
          <CommandGroup
            heading={t('commandMenu.headings.knowledgeBase')}
            className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-black [&_[cmdk-group-heading]]:italic [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.2em] [&_[cmdk-group-heading]]:text-sky-600/70'
          >
            <div className='grid grid-cols-1 gap-1'>
              {entries.map((entry) => (
                <KnowledgeSearchListItem
                  key={entry.id}
                  entry={entry}
                  onSelect={() => onSelect(entry)}
                />
              ))}
            </div>
          </CommandGroup>
        )}
      </div>
    </TabsContent>
  )
}

function KnowledgeSearchListItem({
  entry,
  onSelect,
}: {
  entry: KnowledgeBaseEntry
  onSelect: () => void
}) {
  const { t } = useLanguage()
  const mediaFlags = getKnowledgeContentMediaFlags(entry.content)

  return (
    <CommandItem
      value={`${entry.title} ${entry.summary} ${getKnowledgeContentText(entry.content)} ${entry.routePath} ${entry.keywords.join(' ')}`}
      className='group flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 transition-all data-[selected=true]:scale-[1.01] data-[selected=true]:bg-sky-500/10 data-[selected=true]:text-sky-700'
      onSelect={onSelect}
    >
      <div className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-sky-500/20 bg-sky-500/5 transition-colors group-data-[selected=true]:border-sky-500/40'>
        <BookOpenText className='size-4 text-sky-600' />
      </div>
      <div className='min-w-0 flex-1'>
        <div className='mb-1 flex flex-wrap items-center gap-1.5'>
          <KnowledgeBaseCategoryBadge category={entry.category} />
          <KnowledgeBaseMediaIndicators
            hasImage={mediaFlags.hasImage}
            hasVideo={mediaFlags.hasVideo}
            imageLabel={t('basicSettings.knowledgeBase.media.image')}
            videoLabel={t('basicSettings.knowledgeBase.media.video')}
          />
          {entry.routePath ? (
            <span className='truncate font-mono text-[9px] font-semibold text-muted-foreground/60'>
              {entry.routePath}
            </span>
          ) : null}
        </div>
        <div className='truncate text-sm font-bold tracking-tight'>{entry.title}</div>
        <div className='mt-0.5 line-clamp-1 text-[11px] font-semibold leading-4 text-muted-foreground'>
          {entry.summary}
        </div>
      </div>
    </CommandItem>
  )
}
