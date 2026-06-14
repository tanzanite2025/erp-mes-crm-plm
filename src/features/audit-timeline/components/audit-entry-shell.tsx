import { useState, type ReactNode } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Clock, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'

interface AuditEntryShellProps {
  actionLabel: string
  operator: string
  createdAt: string
  targetLabel: string
  targetValue: string
  headerBadges?: ReactNode
  children: ReactNode
}

interface AuditEntryColumnsProps {
  children: ReactNode
}

interface AuditEntryColumnCardProps {
  title: string
  count?: number | string
  children: ReactNode
  scrollHeightClassName?: string
  contentClassName?: string
}

interface AuditEntrySummaryItem {
  label: string
  value: string
}

interface AuditEntrySummaryListProps {
  items: AuditEntrySummaryItem[]
}

function formatAuditTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return format(date, 'yyyy-MM-dd HH:mm:ss')
}

function normalizeAuditOperatorDisplay(
  operator: string,
  t: ReturnType<typeof useLanguage>['t']
): string {
  const normalizedOperator = operator.trim()
  if (!normalizedOperator) {
    return t('common.audit.operators.unknown')
  }

  if (normalizedOperator.toLowerCase() === 'system') {
    return t('common.audit.operators.system')
  }

  return normalizedOperator
}

export function AuditEntryShell({
  actionLabel,
  operator,
  createdAt,
  targetLabel,
  targetValue,
  headerBadges,
  children,
}: AuditEntryShellProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const operatorDisplay = normalizeAuditOperatorDisplay(operator, t)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='space-y-2'>
      <CollapsibleTrigger className='w-full rounded-[24px] border border-dashed bg-muted/5 px-4 py-4 text-left transition-colors hover:bg-muted/10'>
        <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-[10px] font-black tracking-tighter text-primary uppercase italic'>
              {actionLabel}
            </span>
            <div className='flex items-center gap-1.5 rounded-full border border-dashed border-muted/40 bg-background px-2.5 py-1'>
              <User className='size-3 opacity-50' />
              <span className='text-[10px] font-black tracking-tight text-slate-800'>
                {operatorDisplay}
              </span>
            </div>
            <div className='rounded-full border border-dashed border-muted/40 bg-background px-2.5 py-1 text-[10px] font-black tracking-tight text-slate-800'>
              {targetLabel}: {targetValue}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3 xl:justify-end'>
            {headerBadges}
            <div className='flex items-center gap-1.5 rounded-full border border-dashed border-muted/40 bg-background px-2.5 py-1'>
              <Clock className='size-3 opacity-50' />
              <span className='text-[10px] font-black tracking-tight text-slate-800'>
                {formatAuditTimestamp(createdAt)}
              </span>
            </div>
            <span
              className={`rounded-2xl border border-dashed border-muted/40 bg-background p-2 text-muted-foreground/60 transition-transform ${open ? 'rotate-180' : ''}`}
            >
              <ChevronDown className='size-4' />
            </span>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AuditEntryColumns({ children }: AuditEntryColumnsProps) {
  return <div className='grid gap-3 xl:grid-cols-3'>{children}</div>
}

export function AuditEntryColumnCard({
  title,
  count,
  children,
  scrollHeightClassName,
  contentClassName,
}: AuditEntryColumnCardProps) {
  const body = (
    <div className={contentClassName ?? 'flex flex-col gap-2'}>{children}</div>
  )

  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black tracking-widest text-muted-foreground/70 uppercase'>
          {title}
        </div>
        {typeof count === 'undefined' ? null : (
          <Badge
            variant='outline'
            className='rounded-full border-dashed bg-white font-mono text-[8px]'
          >
            {count}
          </Badge>
        )}
      </div>
      {scrollHeightClassName ? (
        <ScrollArea className={`mt-3 pr-3 ${scrollHeightClassName}`}>
          {body}
        </ScrollArea>
      ) : (
        <div className='mt-3'>{body}</div>
      )}
    </div>
  )
}

export function AuditEntrySummaryList({ items }: AuditEntrySummaryListProps) {
  return (
    <div className='flex flex-col gap-3'>
      {items.map((item) => (
        <div
          key={item.label}
          className='flex items-start justify-between gap-3 border-b border-dashed border-muted/30 pb-2 last:border-b-0 last:pb-0'
        >
          <span className='shrink-0 text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase'>
            {item.label}
          </span>
          <span className='text-right text-[10px] font-black tracking-tight break-all text-slate-700'>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
