import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, Clock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLanguage } from '@/context/language-provider'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { buildBomAuditSummary, type BomAuditControlChange, type BomAuditLineChange, type BomAuditModifiedLineChange } from '../utils/bom-audit'
import type { AuditLog } from '../types'

function formatAuditDisplayText(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || '—'
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => formatAuditDisplayText(item)).join(', ') : '—'
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '—'
    }
  }
  return String(value)
}

function formatBomFieldLabel(field: string, t: ReturnType<typeof useLanguage>['t']): string {
  switch (field) {
    case 'bomNo':
      return t('common.audit.bom.fieldLabels.bomNo')
    case 'productId':
      return t('common.audit.bom.fieldLabels.productId')
    case 'version':
      return t('common.audit.bom.fieldLabels.version')
    case 'status':
      return t('common.audit.bom.fieldLabels.status')
    case 'description':
      return t('common.audit.bom.fieldLabels.description')
    case 'revisionNo':
      return t('common.audit.bom.fieldLabels.revisionNo')
    case 'effectiveFrom':
      return t('common.audit.bom.fieldLabels.effectiveFrom')
    case 'effectiveTo':
      return t('common.audit.bom.fieldLabels.effectiveTo')
    case 'changeType':
      return t('common.audit.bom.fieldLabels.changeType')
    case 'changeOrderNo':
      return t('common.audit.bom.fieldLabels.changeOrderNo')
    case 'siteCode':
      return t('common.audit.bom.fieldLabels.siteCode')
    case 'isDefaultSite':
      return t('common.audit.bom.fieldLabels.isDefaultSite')
    case 'section':
      return t('common.audit.bom.fieldLabels.section')
    case 'materialId':
      return t('common.audit.bom.fieldLabels.materialId')
    case 'unitPrice':
      return t('common.audit.bom.fieldLabels.unitPrice')
    case 'unit':
      return t('common.audit.bom.fieldLabels.unit')
    case 'unitUsage':
      return t('common.audit.bom.fieldLabels.unitUsage')
    case 'wastagePercent':
      return t('common.audit.bom.fieldLabels.wastagePercent')
    case 'materialType':
      return t('common.audit.bom.fieldLabels.materialType')
    case 'supplyChannel':
      return t('common.audit.bom.fieldLabels.supplyChannel')
    default:
      return field
  }
}

function resolveMaterialDisplay(
  item: Pick<BomAuditLineChange, 'materialId' | 'section' | 'substituteCount'>,
  materialOptionMap: ReadonlyMap<string, MaterialOption>,
  t: ReturnType<typeof useLanguage>['t']
) {
  const material = materialOptionMap.get(item.materialId)

  return {
    materialName: material?.name?.trim() || t('common.audit.bom.unknownMaterial'),
    materialCode: material?.code?.trim() || item.materialId || t('common.empty.noRecords'),
    section: item.section?.trim() || t('common.empty.noRecords'),
    substituteCount: item.substituteCount,
  }
}

function ChangeCountBadge({ label, count, tone }: { label: string; count: number; tone: 'emerald' | 'rose' | 'amber' | 'slate' }) {
  const toneClassName =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700'
      : tone === 'rose'
        ? 'border-rose-500/20 bg-rose-500/5 text-rose-700'
        : tone === 'amber'
          ? 'border-amber-500/20 bg-amber-500/5 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <Badge variant='outline' className={`rounded-full border-dashed text-[8px] font-mono ${toneClassName}`}>
      {label} {count}
    </Badge>
  )
}

function BomAuditLineListCard({
  title,
  items,
  emptyText,
  tone,
  materialOptionMap,
  t,
}: {
  title: string
  items: BomAuditLineChange[]
  emptyText: string
  tone: 'emerald' | 'rose'
  materialOptionMap: ReadonlyMap<string, MaterialOption>
  t: ReturnType<typeof useLanguage>['t']
}) {
  const toneClassName =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-700'
      : 'border-rose-500/20 bg-rose-500/5 text-rose-700'

  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{title}</div>
        <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono'>
          {items.length}
        </Badge>
      </div>
      <ScrollArea className='mt-3 h-[180px] pr-3'>
        <div className='flex flex-col gap-2'>
          {items.length > 0 ? (
            items.map((item) => {
              const display = resolveMaterialDisplay(item, materialOptionMap, t)

              return (
                <div key={item.key} className='rounded-2xl border border-dashed bg-background p-3'>
                  <div className='flex items-center justify-between gap-3'>
                    <Badge variant='outline' className={`rounded-full border-dashed text-[8px] font-mono ${toneClassName}`}>
                      {display.materialCode}
                    </Badge>
                    <span className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {title}
                    </span>
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                    {display.materialName}
                  </div>
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    <Badge variant='outline' className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'>
                      {formatBomFieldLabel('section', t)} · {display.section}
                    </Badge>
                    <Badge variant='outline' className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'>
                      {t('common.audit.bom.materialCode')} · {display.materialCode}
                    </Badge>
                    <Badge variant='outline' className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'>
                      {t('common.audit.bom.substituteCount')} · {display.substituteCount}
                    </Badge>
                  </div>
                </div>
              )
            })
          ) : (
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{emptyText}</span>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function BomAuditModifiedListCard({
  title,
  items,
  emptyText,
  t,
  materialOptionMap,
}: {
  title: string
  items: BomAuditModifiedLineChange[]
  emptyText: string
  t: ReturnType<typeof useLanguage>['t']
  materialOptionMap: ReadonlyMap<string, MaterialOption>
}) {
  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{title}</div>
        <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono'>
          {items.length}
        </Badge>
      </div>
      <ScrollArea className='mt-3 h-[180px] pr-3'>
        <div className='flex flex-col gap-2'>
          {items.length > 0 ? (
            items.map((item) => {
              const display = resolveMaterialDisplay(item, materialOptionMap, t)

              return (
                <div key={item.key} className='rounded-2xl border border-dashed bg-background p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <Badge variant='outline' className='rounded-full border-dashed border-amber-500/20 bg-amber-500/5 text-[8px] font-mono text-amber-700'>
                      {display.materialCode}
                    </Badge>
                    <div className='flex flex-wrap gap-1'>
                      <ChangeCountBadge label={t('common.audit.actionLabels.added')} count={item.substituteDelta.added} tone='emerald' />
                      <ChangeCountBadge label={t('common.audit.actionLabels.removed')} count={item.substituteDelta.removed} tone='rose' />
                      <ChangeCountBadge label={t('common.audit.bom.updated')} count={item.substituteDelta.updated} tone='amber' />
                    </div>
                  </div>
                  <div className='mt-2 text-sm font-black tracking-tight text-slate-800'>
                    {display.materialName}
                  </div>
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    <Badge variant='outline' className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'>
                      {formatBomFieldLabel('section', t)} · {display.section}
                    </Badge>
                    <Badge variant='outline' className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'>
                      {t('common.audit.bom.materialCode')} · {display.materialCode}
                    </Badge>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-1.5'>
                    {item.changedFields.map((field) => (
                      <Badge key={field} variant='outline' className='rounded-full border-dashed border-slate-200 bg-slate-50 text-[8px] font-mono text-slate-700'>
                        {formatBomFieldLabel(field, t)}
                      </Badge>
                    ))}
                    {item.substituteDelta.added + item.substituteDelta.removed + item.substituteDelta.updated > 0 ? (
                      <Badge variant='outline' className='rounded-full border-dashed border-indigo-500/20 bg-indigo-500/5 text-[8px] font-mono text-indigo-700'>
                        {t('common.audit.bom.substituteChanges')}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              )
            })
          ) : (
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{emptyText}</span>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function BomAuditSummaryCard({
  targetBomNo,
  beforeItemCount,
  afterItemCount,
  substituteChangeCount,
  controlChanges,
  t,
}: {
  targetBomNo: string
  beforeItemCount: number
  afterItemCount: number
  substituteChangeCount: number
  controlChanges: BomAuditControlChange[]
  t: ReturnType<typeof useLanguage>['t']
}) {
  const summaryItems = [
    { label: t('common.audit.bom.targetBom'), value: targetBomNo || '—' },
    { label: t('common.audit.bom.beforeItemCount'), value: String(beforeItemCount) },
    { label: t('common.audit.bom.afterItemCount'), value: String(afterItemCount) },
    { label: t('common.audit.bom.substituteChanges'), value: String(substituteChangeCount) },
  ]

  return (
    <div className='rounded-[24px] border border-dashed bg-muted/5 p-4'>
      <div className='flex items-center justify-between gap-3'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{t('common.audit.bom.summary')}</div>
        <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono'>
          {controlChanges.length}
        </Badge>
      </div>
      <div className='mt-3 flex flex-col gap-3'>
        {summaryItems.map((item) => (
          <div key={item.label} className='flex items-start justify-between gap-3 border-b border-dashed border-muted/30 pb-2 last:border-b-0 last:pb-0'>
            <span className='shrink-0 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>{item.label}</span>
            <span className='break-all text-right text-[10px] font-black tracking-tight text-slate-700'>{item.value}</span>
          </div>
        ))}
      </div>
      <div className='mt-4 border-t border-dashed border-muted/30 pt-4'>
        <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>{t('common.audit.bom.controlChanges')}</div>
        <ScrollArea className='mt-3 h-[120px] pr-3'>
          <div className='flex flex-col gap-2'>
            {controlChanges.length > 0 ? (
              controlChanges.map((item) => (
                <div key={item.key} className='rounded-2xl border border-dashed bg-background p-3'>
                  <div className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                    {formatBomFieldLabel(item.key, t)}
                  </div>
                  <div className='mt-1 text-[10px] font-black tracking-tight text-slate-700'>
                    {formatAuditDisplayText(item.beforeValue)} → {formatAuditDisplayText(item.afterValue)}
                  </div>
                </div>
              ))
            ) : (
              <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{t('common.empty.noRecords')}</span>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export function BomAuditEntry({
  log,
  actionLabel,
  materialOptionMap,
}: {
  log: AuditLog
  actionLabel: string
  materialOptionMap: ReadonlyMap<string, MaterialOption>
}) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const summary = useMemo(() => buildBomAuditSummary(log), [log])

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
              {t('common.audit.bom.targetBom')}: {summary.targetBomNo || log.target_id || t('common.empty.noRecords')}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2 xl:justify-end'>
            <ChangeCountBadge label={t('common.audit.actionLabels.added')} count={summary.addedItems.length} tone='emerald' />
            <ChangeCountBadge label={t('common.audit.actionLabels.removed')} count={summary.removedItems.length} tone='rose' />
            <ChangeCountBadge label={t('common.audit.bom.modifiedItems')} count={summary.modifiedItems.length} tone='amber' />
            <ChangeCountBadge label={t('common.audit.bom.substituteChanges')} count={summary.substituteChangeCount} tone='slate' />
            <div className='flex items-center gap-1.5 rounded-full border border-dashed border-muted/40 bg-background px-2 py-1'>
              <Clock className='size-3 opacity-50' />
              <span className='text-[8px] font-mono'>{format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss')}</span>
            </div>
            <span className={`rounded-2xl border border-dashed border-muted/40 bg-background p-2 text-muted-foreground/60 transition-transform ${open ? 'rotate-180' : ''}`}>
              <ChevronDown className='size-4' />
            </span>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <div className='grid gap-3 xl:grid-cols-2'>
          <BomAuditLineListCard
            title={t('common.audit.bom.addedItems')}
            items={summary.addedItems}
            emptyText={t('common.empty.noRecords')}
            tone='emerald'
            materialOptionMap={materialOptionMap}
            t={t}
          />
          <BomAuditLineListCard
            title={t('common.audit.bom.removedItems')}
            items={summary.removedItems}
            emptyText={t('common.empty.noRecords')}
            tone='rose'
            materialOptionMap={materialOptionMap}
            t={t}
          />
          <BomAuditModifiedListCard
            title={t('common.audit.bom.modifiedItems')}
            items={summary.modifiedItems}
            emptyText={t('common.empty.noRecords')}
            t={t}
            materialOptionMap={materialOptionMap}
          />
          <BomAuditSummaryCard
            targetBomNo={summary.targetBomNo}
            beforeItemCount={summary.beforeItemCount}
            afterItemCount={summary.afterItemCount}
            substituteChangeCount={summary.substituteChangeCount}
            controlChanges={summary.controlChanges}
            t={t}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
