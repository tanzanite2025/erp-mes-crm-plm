import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Clock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import { buildUserPermissionAuditSummary } from '../utils/permission-audit'
import type { AuditLog } from '../types'

function translatePermissionAuditSource(source: string, t: ReturnType<typeof useLanguage>['t']) {
  switch (source.trim().toLowerCase()) {
    case 'manual':
      return t('common.audit.permission.sourceManual')
    case 'system':
      return t('common.audit.permission.sourceSystem')
    default:
      return source.trim() || t('common.audit.permission.sourceUnknown')
  }
}

function translatePermissionAuditReason(reason: string, t: ReturnType<typeof useLanguage>['t']) {
  switch (reason.trim().toLowerCase()) {
    case 'users_permissions_dialog_save':
      return t('common.audit.permission.reasonUsersPermissionsDialogSave')
    default:
      return reason.trim() || t('common.audit.permission.reasonUnknown')
  }
}

function PermissionBadgeList({
  title,
  items,
  emptyText,
  tone,
  heightClassName,
}: {
  title: string
  items: Array<{ key: string; label: string }>
  emptyText: string
  tone: 'emerald' | 'rose' | 'slate'
  heightClassName?: string
}) {
  const toneClassName =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700'
      : tone === 'rose'
        ? 'border-rose-500/20 bg-rose-500/5 text-rose-700'
        : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{title}</div>
        <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono'>
          {items.length}
        </Badge>
      </div>
      <ScrollArea className={`mt-3 pr-3 ${heightClassName ?? 'h-[160px]'}`}>
        <div className='flex flex-wrap gap-2'>
          {items.length > 0 ? (
            items.map((item) => (
              <Badge
                key={item.key}
                variant='outline'
                className={`rounded-full border-dashed bg-white text-[8px] font-mono ${toneClassName}`}
              >
                {item.label}
              </Badge>
            ))
          ) : (
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{emptyText}</span>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function PermissionSummaryCard({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{title}</div>
      <div className='mt-3 flex h-[160px] flex-col gap-3 overflow-hidden'>
        {items.map((item) => (
          <div
            key={item.label}
            className='flex items-start justify-between gap-3 border-b border-dashed border-muted/30 pb-2 last:border-b-0 last:pb-0'
          >
            <span className='shrink-0 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
              {item.label}
            </span>
            <span className='break-all text-right text-[10px] font-black tracking-tight text-slate-700'>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function UserPermissionAuditEntry({
  log,
  actionLabel,
  permissionLabelMap,
}: {
  log: AuditLog
  actionLabel: string
  permissionLabelMap: ReadonlyMap<string, string>
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const summary = useMemo(() => buildUserPermissionAuditSummary(log, permissionLabelMap), [log, permissionLabelMap])
  const targetDisplayName = summary.target?.username || log.target_id || t('common.audit.permission.none')
  const summaryItems = [
    {
      label: t('common.audit.permission.targetAccount'),
      value: targetDisplayName,
    },
    {
      label: t('common.audit.permission.source'),
      value: translatePermissionAuditSource(summary.source, t),
    },
    {
      label: t('common.audit.permission.reason'),
      value: translatePermissionAuditReason(summary.reason, t),
    },
    {
      label: t('common.audit.permission.grantedBy'),
      value: summary.grantedBy || log.operator || t('common.audit.permission.none'),
    },
  ]

  return (
    <Collapsible open={open} onOpenChange={setOpen} className='space-y-3'>
      <CollapsibleTrigger className='w-full rounded-[24px] border border-dashed bg-muted/5 px-4 py-4 text-left transition-colors hover:bg-muted/10'>
        <div className='flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-[10px] font-black italic tracking-tighter uppercase text-primary'>
              {actionLabel}
            </span>
            <div className='flex items-center gap-1.5 rounded-full border border-dashed border-muted/40 bg-background px-2 py-1'>
              <User className='size-3 opacity-50' />
              <span className='text-[8px] font-mono font-bold uppercase'>{log.operator}</span>
            </div>
            <div className='rounded-full border border-dashed border-muted/40 bg-background px-2 py-1 text-[8px] font-black uppercase tracking-widest text-slate-700'>
              {t('common.audit.permission.targetAccount')}: {targetDisplayName}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2 xl:justify-end'>
            <Badge
              variant='outline'
              className='rounded-full border-dashed border-emerald-500/20 bg-emerald-500/5 text-[8px] font-mono text-emerald-700'
            >
              {t('common.audit.actionLabels.added')} {summary.addedPermissionItems.length}
            </Badge>
            <Badge
              variant='outline'
              className='rounded-full border-dashed border-rose-500/20 bg-rose-500/5 text-[8px] font-mono text-rose-700'
            >
              {t('common.audit.actionLabels.removed')} {summary.removedPermissionItems.length}
            </Badge>
            <div className='flex items-center gap-1.5 rounded-full border border-dashed border-muted/40 bg-background px-2 py-1'>
              <Clock className='size-3 opacity-50' />
              <span className='text-[8px] font-mono'>{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
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
        <div className='grid gap-3 xl:grid-cols-3'>
          <PermissionBadgeList
            title={t('common.audit.permission.addedPermissions')}
            items={summary.addedPermissionItems}
            emptyText={t('common.audit.permission.none')}
            tone='emerald'
            heightClassName='h-[160px]'
          />
          <PermissionBadgeList
            title={t('common.audit.permission.removedPermissions')}
            items={summary.removedPermissionItems}
            emptyText={t('common.audit.permission.none')}
            tone='rose'
            heightClassName='h-[160px]'
          />
          <PermissionSummaryCard title={t('common.audit.permission.summary')} items={summaryItems} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
