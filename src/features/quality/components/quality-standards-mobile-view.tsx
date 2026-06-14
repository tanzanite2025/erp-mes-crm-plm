import { Layers, User, Clock, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import type { Standard } from '../data/schema'
import type { QualityStandardListItemPresenter } from '../presenters/quality-standard-list-presenter'

interface QualityStandardsMobileViewProps {
  standards: QualityStandardListItemPresenter[]
  onViewDetail: (standard: Standard) => void
  onEdit: (standard: Standard) => void
}

export function QualityStandardsMobileView({
  standards,
  onViewDetail,
  onEdit,
}: QualityStandardsMobileViewProps) {
  return (
    <div className='grid grid-cols-1 gap-4'>
      {standards.map((standard) => (
        <Card
          key={standard.id}
          className='group relative overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 transition-all active:scale-[0.98]'
          onClick={() => onViewDetail(standard.source)}
        >
          <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
          <CardContent className='flex flex-col gap-4 p-5'>
            <div className='flex items-start justify-between gap-4'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/20'>
                  <Layers className='size-5 opacity-40' />
                </div>
                <div className='flex min-w-0 flex-col'>
                  <h3 className='truncate text-sm font-bold tracking-tight text-slate-700'>
                    {standard.name}
                  </h3>
                  <span className='font-mono text-[10px] text-muted-foreground/40'>
                    {standard.code}
                  </span>
                </div>
              </div>
              <div className='flex shrink-0 flex-col items-end gap-1.5'>
                <div className='inline-flex h-5 items-center justify-center rounded-lg border border-primary/10 bg-primary/5 px-1.5 font-mono text-[8px] font-black tracking-tighter text-primary uppercase'>
                  {standard.versionText}
                </div>
                <span className='rounded-md bg-muted/20 px-2 py-0.5 text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {standard.typeLabel}
                </span>
              </div>
            </div>

            <div className='flex items-center justify-between border-t border-dashed border-muted/20 pt-3'>
              <div className='flex flex-col gap-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <div
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${standard.statusMeta.className}`}
                  >
                    <div
                      className={`size-1 rounded-full ${standard.statusMeta.dotClassName}`}
                    />
                    <span className='text-[8px] font-black tracking-widest uppercase italic'>
                      {standard.statusMeta.label}
                    </span>
                  </div>
                  <AuditStatusDisplay meta={standard.auditMeta} italic />
                  <span
                    className={`rounded-full px-2 py-1 text-[8px] font-black tracking-widest uppercase ${standard.approvalChainClassName}`}
                  >
                    {standard.approvalChainLabel}
                  </span>
                  {standard.processSummaryLabel &&
                  standard.processSummaryClassName ? (
                    <span
                      className={`rounded-full px-2 py-1 text-[8px] font-black tracking-widest uppercase ${standard.processSummaryClassName}`}
                    >
                      {standard.processSummaryLabel}
                    </span>
                  ) : null}
                </div>
                <div className='flex flex-col'>
                  <div className='flex items-center gap-1'>
                    <User className='size-2.5 text-muted-foreground/40' />
                    <span className='text-[9px] font-black text-slate-500 uppercase'>
                      {standard.operatorName}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Clock className='size-2.5 text-muted-foreground/40' />
                    <span className='font-mono text-[9px] text-muted-foreground/40 tabular-nums'>
                      {standard.operateTimeText}
                    </span>
                  </div>
                  {standard.decisionActor ? (
                    <span className='mt-1 text-[9px] font-black text-primary/80 uppercase'>
                      {standard.decisionActor}
                    </span>
                  ) : null}
                  {standard.decisionSummary ? (
                    <span className='text-[8px] font-black tracking-widest text-foreground/65 uppercase'>
                      {standard.decisionSummary}
                    </span>
                  ) : null}
                  {standard.decisionReason ? (
                    <span className='max-w-[220px] truncate text-[9px] font-medium text-muted-foreground/70'>
                      {standard.decisionReason}
                    </span>
                  ) : null}
                  {standard.decisionTimestampText ? (
                    <span className='font-mono text-[8px] text-muted-foreground/35 tabular-nums'>
                      {standard.decisionTimestampText}
                    </span>
                  ) : null}
                  {standard.processSummaryHint ? (
                    <span className='max-w-[220px] truncate text-[8px] font-medium text-muted-foreground/55'>
                      {standard.processSummaryHint}
                    </span>
                  ) : null}
                  <AuditStatusDisplay
                    meta={standard.auditMeta}
                    className='mt-1'
                    showBadge={false}
                    showNote
                    noteVariant='text'
                  />
                </div>
              </div>

              {standard.canEdit ? (
                <Button
                  variant='ghost'
                  size='icon'
                  className='size-9 rounded-xl hover:bg-primary/10 hover:text-primary active:scale-95'
                  onClick={(event) => {
                    event.stopPropagation()
                    onEdit(standard.source)
                  }}
                >
                  <MoreHorizontal className='size-4' />
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
