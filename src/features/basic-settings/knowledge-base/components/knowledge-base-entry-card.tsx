import { Link } from '@tanstack/react-router'
import { Edit3, ExternalLink, Image as ImageIcon, Trash2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import type { KnowledgeBaseEntry } from '../data/knowledge-base'
import { getKnowledgeContentMediaFlags } from '../data/knowledge-content'
import { KnowledgeBaseCategoryBadge } from './knowledge-base-category-badge'
import { KnowledgeBaseRichContent } from './knowledge-base-rich-content'

interface KnowledgeBaseEntryCardProps {
  entry: KnowledgeBaseEntry
  onEdit: (entry: KnowledgeBaseEntry) => void
  onDelete: (entryId: string) => void
}

export function KnowledgeBaseEntryCard({
  entry,
  onEdit,
  onDelete,
}: KnowledgeBaseEntryCardProps) {
  const { t } = useLanguage()
  const mediaFlags = getKnowledgeContentMediaFlags(entry.content)

  return (
    <article className='rounded-2xl border border-dashed border-muted/50 bg-background px-4 py-3 shadow-sm transition-colors hover:border-primary/30'>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <KnowledgeBaseCategoryBadge category={entry.category} />
            <KnowledgeBaseMediaIndicators
              hasImage={mediaFlags.hasImage}
              hasVideo={mediaFlags.hasVideo}
              imageLabel={t('basicSettings.knowledgeBase.media.image')}
              videoLabel={t('basicSettings.knowledgeBase.media.video')}
            />
            {entry.routePath ? (
              <span className='truncate font-mono text-[10px] font-semibold text-muted-foreground/75'>
                {entry.routePath}
              </span>
            ) : null}
          </div>
          <h3 className='mt-2 line-clamp-1 text-[14px] font-black leading-5 text-foreground'>
            {entry.title}
          </h3>
          <p className='mt-1 line-clamp-1 text-[12px] font-bold leading-5 text-muted-foreground'>
            {entry.summary}
          </p>
          <KnowledgeBaseRichContent
            content={entry.content}
            variant='compact'
            className='mt-1.5'
          />
          {entry.keywords.length > 0 ? (
            <div className='mt-2 flex flex-wrap gap-1.5'>
              {entry.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className='rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground/80'
                >
                  {keyword}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className='flex shrink-0 flex-wrap gap-2 lg:flex-nowrap'>
          {entry.routePath ? (
            <Button
              variant='outline'
              size='sm'
              className='h-8 rounded-full border-dashed px-3 text-[11px] font-bold'
              asChild
            >
              <Link to={entry.routePath as any}>
                <ExternalLink className='mr-1.5 size-3.5' />
                {t('basicSettings.knowledgeBase.actions.openRoute')}
              </Link>
            </Button>
          ) : null}
          <Button
            variant='outline'
            size='sm'
            className='h-8 rounded-full border-dashed px-3 text-[11px] font-bold'
            onClick={() => onEdit(entry)}
          >
            <Edit3 className='mr-1.5 size-3.5' />
            {t('common.actions.edit')}
          </Button>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 rounded-full px-3 text-[11px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive'
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className='mr-1.5 size-3.5' />
            {t('common.actions.delete')}
          </Button>
        </div>
      </div>
    </article>
  )
}

function KnowledgeBaseMediaIndicators({
  hasImage,
  hasVideo,
  imageLabel,
  videoLabel,
}: {
  hasImage: boolean
  hasVideo: boolean
  imageLabel: string
  videoLabel: string
}) {
  if (!hasImage && !hasVideo) return null

  return (
    <span className='flex items-center gap-1'>
      {hasImage ? (
        <span
          title={imageLabel}
          aria-label={imageLabel}
          className='flex size-6 items-center justify-center rounded-full border border-sky-500/20 bg-sky-500/10 text-sky-600'
        >
          <ImageIcon className='size-3.5' />
        </span>
      ) : null}
      {hasVideo ? (
        <span
          title={videoLabel}
          aria-label={videoLabel}
          className='flex size-6 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600'
        >
          <Video className='size-3.5' />
        </span>
      ) : null}
    </span>
  )
}
