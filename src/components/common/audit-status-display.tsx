import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface AuditStatusDisplayMeta {
  label: string
  note?: string
  className: string
  dotClassName?: string
}

interface AuditStatusDisplayProps {
  meta: AuditStatusDisplayMeta
  className?: string
  badgeClassName?: string
  labelClassName?: string
  noteClassName?: string
  showBadge?: boolean
  showNote?: boolean
  noteVariant?: 'text' | 'box'
  size?: 'sm' | 'md'
  italic?: boolean
}

export function AuditStatusDisplay({
  meta,
  className,
  badgeClassName,
  labelClassName,
  noteClassName,
  showBadge = true,
  showNote = false,
  noteVariant = 'box',
  size = 'sm',
  italic = false,
}: AuditStatusDisplayProps) {
  const dotSizeClassName = size === 'md' ? 'size-1.5' : 'size-1'
  const badgeSizeClassName =
    size === 'md'
      ? 'gap-2 px-3 py-1.5 rounded-full'
      : 'gap-1.5 px-2.5 py-1 rounded-full'
  const labelSizeClassName =
    size === 'md'
      ? 'text-[8px] tracking-widest'
      : 'text-[8px] tracking-widest'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {showBadge ? (
        <Badge
          className={cn(
            'w-fit border font-black uppercase shadow-none',
            badgeSizeClassName,
            meta.className,
            badgeClassName
          )}
        >
          {meta.dotClassName ? (
            <div className={cn('rounded-full', dotSizeClassName, meta.dotClassName)} />
          ) : null}
          <span className={cn(labelSizeClassName, italic && 'italic', labelClassName)}>
            {meta.label}
          </span>
        </Badge>
      ) : null}

      {showNote && meta.note ? (
        noteVariant === 'text' ? (
          <div
            className={cn(
              'text-[8px] font-medium leading-4 text-muted-foreground/50',
              noteClassName
            )}
          >
            {meta.note}
          </div>
        ) : (
          <div
            className={cn(
              'rounded-xl border border-dashed px-3 py-2 text-[10px] font-medium leading-5',
              meta.className,
              noteClassName
            )}
          >
            {meta.note}
          </div>
        )
      ) : null}
    </div>
  )
}
