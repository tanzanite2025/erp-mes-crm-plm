import { ImageIcon, PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PersonalRecord } from '../data/schema'

interface PersonalWorkbenchCardProps {
  isDragging?: boolean
  onDragStart?: (record: PersonalRecord) => void
  onDragEnd?: () => void
  record: PersonalRecord
  onEdit: (record: PersonalRecord) => void
}

export function PersonalWorkbenchCard({
  isDragging = false,
  onDragEnd,
  onDragStart,
  record,
  onEdit,
}: PersonalWorkbenchCardProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(record)}
      onDragEnd={onDragEnd}
      className={cn(
        'space-y-3 rounded-[24px] border border-dashed border-muted/50 bg-background/80 p-3 shadow-sm transition-opacity',
        isDragging && 'opacity-40'
      )}
    >
      {record.coverImageUrl ? (
        <img src={record.coverImageUrl} alt={record.title} className='aspect-video w-full rounded-2xl object-cover' />
      ) : (
        <div className='flex aspect-video items-center justify-center rounded-2xl border border-dashed border-muted/50 bg-muted/10 text-muted-foreground/40'>
          <ImageIcon className='size-5' />
        </div>
      )}
      <div className='space-y-1'>
        <div className='line-clamp-2 text-sm font-black tracking-tight text-foreground'>{record.title}</div>
        <p className='line-clamp-3 text-[11px] font-medium leading-relaxed text-muted-foreground'>
          {record.note || '暂无备注'}
        </p>
      </div>
      <div className='flex items-center justify-between'>
        <span className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
          {record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : '刚刚'}
        </span>
        <Button type='button' variant='ghost' size='icon' className='size-8 rounded-xl' onClick={() => onEdit(record)}>
          <PencilLine className='size-4' />
        </Button>
      </div>
    </div>
  )
}
