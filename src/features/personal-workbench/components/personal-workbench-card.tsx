import { ImageIcon, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { PersonalRecord } from '../data/schema'

interface PersonalWorkbenchCardProps {
  isCompactLayout?: boolean
  isDragging?: boolean
  onDragStart?: (record: PersonalRecord) => void
  onDragEnd?: () => void
  record: PersonalRecord
  onEdit: (record: PersonalRecord) => void
}

export function PersonalWorkbenchCard({
  isCompactLayout = false,
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
        isCompactLayout
          ? 'space-y-2 rounded-[20px] border border-dashed border-muted/50 bg-background/80 p-2.5 shadow-sm transition-opacity'
          : 'space-y-3 rounded-[24px] border border-dashed border-muted/50 bg-background/80 p-3 shadow-sm transition-opacity',
        isDragging && 'opacity-40'
      )}
    >
      {record.coverImageUrl ? (
        <img
          src={record.coverImageUrl}
          alt={record.title}
          className='aspect-video w-full rounded-2xl object-cover'
        />
      ) : (
        <div className='flex aspect-video items-center justify-center rounded-2xl border border-dashed border-muted/50 bg-muted/10 text-muted-foreground/40'>
          <ImageIcon className={isCompactLayout ? 'size-4' : 'size-5'} />
        </div>
      )}
      <div className='space-y-1'>
        <div
          className={
            isCompactLayout
              ? 'line-clamp-2 text-xs font-black tracking-tight text-foreground'
              : 'line-clamp-2 text-sm font-black tracking-tight text-foreground'
          }
        >
          {record.title}
        </div>
        <p
          className={
            isCompactLayout
              ? 'line-clamp-2 text-[10px] leading-relaxed font-medium text-muted-foreground'
              : 'line-clamp-3 text-[11px] leading-relaxed font-medium text-muted-foreground'
          }
        >
          {record.note || '暂无备注'}
        </p>
      </div>
      <div className='flex items-center justify-between'>
        <span className='text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
          {record.updatedAt
            ? new Date(record.updatedAt).toLocaleDateString()
            : '刚刚'}
        </span>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className={isCompactLayout ? 'size-7 rounded-xl' : 'size-8 rounded-xl'}
          onClick={() => onEdit(record)}
        >
          <PencilLine className={isCompactLayout ? 'size-3.5' : 'size-4'} />
        </Button>
      </div>
    </div>
  )
}
