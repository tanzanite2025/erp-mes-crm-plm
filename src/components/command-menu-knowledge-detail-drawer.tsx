import { ExternalLink, X } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import {
  KNOWLEDGE_BASE_CATEGORIES,
  type KnowledgeBaseEntry,
} from '@/features/basic-settings/knowledge-base/data/knowledge-base'
import { KnowledgeBaseRichContent } from '@/features/basic-settings/knowledge-base/components/knowledge-base-rich-content'
import { cn } from '@/lib/utils'

interface CommandMenuKnowledgeDetailDrawerProps {
  entry: KnowledgeBaseEntry | null
  onClose: () => void
}

export function CommandMenuKnowledgeDetailDrawer({
  entry,
  onClose,
}: CommandMenuKnowledgeDetailDrawerProps) {
  const { t } = useLanguage()
  if (typeof document === 'undefined') return null

  const categoryLabelKey = entry
    ? KNOWLEDGE_BASE_CATEGORIES.find((item) => item.value === entry.category)?.labelKey
    : undefined

  return createPortal(
    <div
      className={cn(
        'fixed inset-x-0 bottom-3 z-[120] mx-auto !w-[85vw] !max-w-[85vw] overflow-hidden rounded-[28px] border border-amber-500/35 bg-background shadow-[0_24px_80px_rgba(245,158,11,0.16)] ring-1 ring-amber-500/20 transition-all duration-300',
        entry
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-8 opacity-0'
      )}
    >
      {entry ? (
        <div className='flex h-[76dvh] max-h-[calc(100dvh-1.5rem)] flex-col sm:h-[72dvh]'>
          <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.12),transparent_34%)]' />
          <div className='relative flex items-start justify-between gap-4 border-b border-dashed border-amber-500/20 px-5 py-4'>
            <div className='min-w-0'>
              <div className='flex flex-wrap items-center gap-2'>
                {categoryLabelKey ? (
                  <Badge variant='secondary' className='rounded-full px-2.5 py-0.5 text-[10px] font-black'>
                    {t(categoryLabelKey as any)}
                  </Badge>
                ) : null}
                {entry.routePath ? (
                  <span className='truncate font-mono text-[10px] font-semibold text-muted-foreground/70'>
                    {entry.routePath}
                  </span>
                ) : null}
              </div>
              <h3 className='mt-2 text-base font-black leading-6 tracking-tight text-foreground'>
                {entry.title}
              </h3>
              <p className='mt-1 text-[12px] font-bold leading-5 text-muted-foreground'>
                {entry.summary}
              </p>
            </div>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-8 shrink-0 rounded-full'
              onClick={onClose}
            >
              <X className='size-4' />
            </Button>
          </div>

          <ScrollArea className='relative min-h-0 flex-1'>
            <div className='space-y-4 px-5 py-4'>
              <KnowledgeBaseRichContent
                content={entry.content}
                tone='amber'
                className='leading-7 [&_img]:max-h-[52dvh]'
              />
              {entry.keywords.length > 0 ? (
                <div className='flex flex-wrap gap-1.5'>
                  {entry.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className='rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground'
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </ScrollArea>

          {entry.routePath ? (
            <div className='relative flex justify-end border-t border-dashed border-amber-500/20 bg-amber-500/5 px-5 py-3'>
              <Button asChild className='h-9 cursor-pointer rounded-full px-4 text-[11px] font-black'>
                <Link to={entry.routePath as any}>
                  <ExternalLink className='mr-1.5 size-3.5' />
                  {t('basicSettings.knowledgeBase.actions.openRoute')}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>,
    document.body
  )
}
