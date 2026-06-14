import { Calendar, Edit, Eye, Hash, Layers, Target, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import type { DrillingPlan } from '../data/schema'
import type { DrillingRowViewModel } from '../hooks/use-drilling-page-state'
import { getEngineeringDbFileVisual } from '../view-helpers'

interface DrillingMobileListProps {
  rows: DrillingRowViewModel[]
  isLoading: boolean
  highlightId?: string
  onPreview: (item: DrillingPlan) => void
  onEdit: (item: DrillingPlan) => void
  onDelete: (item: DrillingPlan) => void
}

export function DrillingMobileList({
  rows,
  isLoading,
  highlightId,
  onPreview,
  onEdit,
  onDelete,
}: DrillingMobileListProps) {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-4 md:hidden'>
      {isLoading ? (
        <div className='animate-pulse p-12 text-center text-[10px] font-black text-muted-foreground uppercase italic'>
          {t('engineering.drilling.placeholders.mobileLoading')}
        </div>
      ) : rows.length === 0 ? (
        <div className='rounded-[28px] border border-dashed border-muted-foreground/50 bg-muted/5 p-12 text-center text-[10px] text-muted-foreground uppercase italic opacity-40'>
          {t('engineering.drilling.placeholders.noData')}
        </div>
      ) : (
        rows.map((row) => {
          const item = row.item
          const fileVisual = getEngineeringDbFileVisual({
            extension: item.fileExtension,
            category: 'DRILLING',
          })
          const Icon = fileVisual.icon

          return (
            <div
              key={item.id}
              onClick={() => onPreview(item)}
              className={cn(
                'group relative overflow-hidden rounded-[28px] border border-dashed border-muted/50 bg-background/50 p-5 transition-all active:scale-[0.98]',
                item.id === highlightId &&
                  'animate-pulse bg-indigo-500/5 ring-2 ring-indigo-500/20'
              )}
            >
              <div className='absolute top-0 right-0 p-4 opacity-10'>
                <Icon className={cn('size-16', fileVisual.iconClassName)} />
              </div>

              <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <div
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm',
                      fileVisual.containerClassName
                    )}
                  >
                    <Icon className={cn('size-5', fileVisual.iconClassName)} />
                  </div>
                  <Badge
                    variant='outline'
                    className='h-5 rounded-full border-none bg-indigo-500/10 px-3 font-mono text-[10px] leading-none font-black text-indigo-600 italic'
                  >
                    {row.productSku || 'GENERIC'}
                  </Badge>
                </div>

                <div>
                  <h4 className='line-clamp-2 text-sm leading-tight font-black tracking-tight transition-colors group-active:text-indigo-600'>
                    {item.name}
                  </h4>
                  <div className='mt-3 flex flex-wrap items-center gap-2 font-black tracking-widest uppercase'>
                    <div className='flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[9px] text-muted-foreground'>
                      <Layers className='size-3 opacity-40' />
                      {item.weavingModeLabel || 'Std'}
                    </div>
                    <div className='flex items-center gap-1.5 rounded-full bg-indigo-500/5 px-2 py-0.5 text-[9px] text-indigo-600'>
                      <Target className='size-3 opacity-40' />
                      {item.standardHoles || '??'}H
                    </div>
                    <div className='size-1 rounded-full bg-muted-foreground/20' />
                    <div className='flex items-center gap-1 font-mono text-[9px] text-muted-foreground/60 italic'>
                      <Hash className='size-2.5 opacity-30' />
                      {item.id.split('-').pop()}
                    </div>
                  </div>
                </div>

                <div className='flex items-center justify-between border-t border-dashed border-muted-foreground/10 pt-3'>
                  <div className='flex items-center gap-2 text-[9px] font-medium text-muted-foreground/40 italic'>
                    <Calendar className='size-3 opacity-30' />
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : 'N/A'}
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-full hover:bg-orange-500/10 hover:text-orange-500'
                      onClick={(event) => {
                        event.stopPropagation()
                        onPreview(item)
                      }}
                    >
                      <Eye className='size-4' />
                    </Button>
                    <div onClick={(event) => event.stopPropagation()}>
                      <AuditTimelineTriggerButton
                        module={AUDIT_MODULES.drilling}
                        targetId={item.id}
                        targetName={item.name}
                        iconOnly
                        className='size-8 rounded-full px-0'
                      />
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-full'
                      onClick={(event) => {
                        event.stopPropagation()
                        onEdit(item)
                      }}
                    >
                      <Edit className='size-3.5' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 rounded-full text-destructive/40'
                      onClick={(event) => {
                        event.stopPropagation()
                        onDelete(item)
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
