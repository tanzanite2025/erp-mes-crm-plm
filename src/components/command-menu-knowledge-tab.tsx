import { BookOpenText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  canCreateEntry: boolean
  onCreateEntry: () => void
  onSelect: (entry: KnowledgeBaseEntry) => void
}

export function CommandMenuKnowledgeTab({
  entries,
  canCreateEntry,
  onCreateEntry,
  onSelect,
}: CommandMenuKnowledgeTabProps) {
  const { t } = useLanguage()

  return (
    <TabsContent value='knowledge' className='m-0 focus-visible:outline-none'>
      <div className='p-2.5'>
        {canCreateEntry ? (
          <div className='mb-2 flex justify-end'>
            <Button
              className='h-8 rounded-full px-3 text-[9px] font-black uppercase tracking-[0.18em]'
              onClick={onCreateEntry}
            >
              <Plus className='mr-1.5 size-3' />
              {t('basicSettings.knowledgeBase.actions.create')}
            </Button>
          </div>
        ) : null}
        {entries.length === 0 ? (
          <div className='space-y-2'>
            <div className='text-center text-[7px] font-black uppercase tracking-[0.2em] text-sky-600/70 italic'>
              {t('commandMenu.headings.knowledgeBase')}
            </div>
            <div className='flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-muted/60 bg-muted/10 px-4 py-6 text-center text-[10px] font-bold text-muted-foreground'>
              {t('basicSettings.knowledgeBase.page.empty')}
            </div>
          </div>
        ) : (
          <CommandGroup
            heading={t('commandMenu.headings.knowledgeBase')}
            className='**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1 **:[[cmdk-group-heading]]:text-[8px] **:[[cmdk-group-heading]]:font-black **:[[cmdk-group-heading]]:italic **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.2em] **:[[cmdk-group-heading]]:text-sky-600/70'
          >
            <div className='grid grid-cols-1 gap-0'>
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
      className='group flex cursor-pointer items-start gap-2 rounded-md px-2 py-1 transition-all data-[selected=true]:bg-sky-500/10 data-[selected=true]:text-sky-700'
      onSelect={onSelect}
    >
      <div className='mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed border-sky-500/20 bg-sky-500/5 transition-colors group-data-[selected=true]:border-sky-500/40'>
        <BookOpenText className='size-3 text-sky-600' />
      </div>
      <div className='min-w-0 flex-1 leading-tight'>
        <div className='mb-0.5 flex flex-wrap items-center gap-0.5'>
          <KnowledgeBaseCategoryBadge category={entry.category} className='h-4 px-1.5 py-0 text-[8px] leading-none' />
          <KnowledgeBaseMediaIndicators
            hasImage={mediaFlags.hasImage}
            hasVideo={mediaFlags.hasVideo}
            imageLabel={t('basicSettings.knowledgeBase.media.image')}
            videoLabel={t('basicSettings.knowledgeBase.media.video')}
            compact
          />
          {entry.routePath ? (
            <span className='truncate font-mono text-[7px] font-semibold text-muted-foreground/55'>
              {entry.routePath}
            </span>
          ) : null}
        </div>
        <div className='truncate text-[12px] font-bold tracking-tight'>{entry.title}</div>
        <div className='line-clamp-1 text-[9px] font-semibold leading-3 text-muted-foreground'>
          {entry.summary}
        </div>
      </div>
    </CommandItem>
  )
}
