import { cn } from '@/lib/utils'
import { Calendar, Edit, Eye, Hash, Layers, Target, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/context/language-provider'
import type { DrillingPlan } from '../data/schema'
import { getEngineeringDbFileVisual } from '../view-helpers'
import type { DrillingRowViewModel } from '../hooks/use-drilling-page-state'

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
    <div className='md:hidden flex flex-col gap-4'>
      {isLoading ? (
        <div className='p-12 text-center text-[10px] font-black italic uppercase text-muted-foreground animate-pulse'>{t('engineering.drilling.placeholders.mobileLoading')}</div>
      ) : rows.length === 0 ? (
        <div className='p-12 text-center bg-muted/5 rounded-[28px] border border-dashed border-muted-foreground/50 italic text-[10px] text-muted-foreground opacity-40 uppercase'>{t('engineering.drilling.placeholders.noData')}</div>
      ) : (
        rows.map((row) => {
          const item = row.item
          const fileVisual = getEngineeringDbFileVisual({ extension: item.fileExtension, category: 'DRILLING' })
          const Icon = fileVisual.icon

          return (
            <div
              key={item.id}
              onClick={() => onPreview(item)}
              className={cn(
                'p-5 rounded-[28px] border border-dashed border-muted/50 bg-background/50 active:scale-[0.98] transition-all relative overflow-hidden group',
                item.id === highlightId && 'bg-indigo-500/5 ring-2 ring-indigo-500/20 animate-pulse',
              )}
            >
              <div className='absolute top-0 right-0 p-4 opacity-10'>
                <Icon className={cn('size-16', fileVisual.iconClassName)} />
              </div>

              <div className='flex flex-col gap-4'>
                <div className='flex items-center justify-between'>
                  <div className={cn('size-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm', fileVisual.containerClassName)}>
                    <Icon className={cn('size-5', fileVisual.iconClassName)} />
                  </div>
                  <Badge variant='outline' className='text-[10px] font-black italic font-mono bg-indigo-500/10 border-none text-indigo-600 px-3 rounded-full h-5 leading-none'>
                    {row.productSku || 'GENERIC'}
                  </Badge>
                </div>

                <div>
                  <h4 className='text-sm font-black tracking-tight leading-tight group-active:text-indigo-600 transition-colors line-clamp-2'>{item.name}</h4>
                  <div className='flex flex-wrap items-center gap-2 mt-3 font-black uppercase tracking-widest'>
                    <div className='flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 text-[9px] text-muted-foreground'>
                      <Layers className='size-3 opacity-40' />
                      {item.weavingModeLabel || 'Std'}
                    </div>
                    <div className='flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/5 text-[9px] text-indigo-600'>
                      <Target className='size-3 opacity-40' />
                      {item.standardHoles || '??'}H
                    </div>
                    <div className='size-1 rounded-full bg-muted-foreground/20' />
                    <div className='flex items-center gap-1 text-[9px] text-muted-foreground/60 italic font-mono'>
                      <Hash className='size-2.5 opacity-30' />
                      {item.id.split('-').pop()}
                    </div>
                  </div>
                </div>

                <div className='flex items-center justify-between pt-3 border-t border-dashed border-muted-foreground/10'>
                  <div className='flex items-center gap-2 text-[9px] text-muted-foreground/40 font-medium italic'>
                    <Calendar className='size-3 opacity-30' />
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full hover:bg-orange-500/10 hover:text-orange-500' onClick={(event) => { event.stopPropagation(); onPreview(item) }}><Eye className='size-4' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full' onClick={(event) => { event.stopPropagation(); onEdit(item) }}><Edit className='size-3.5' /></Button>
                    <Button variant='ghost' size='icon' className='size-8 rounded-full text-destructive/40' onClick={(event) => { event.stopPropagation(); onDelete(item) }}><Trash2 className='size-3.5' /></Button>
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
