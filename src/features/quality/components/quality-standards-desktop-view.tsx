import { Layers, Eye, MoreHorizontal } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import type { Standard } from '../data/schema'
import type { QualityStandardListItemPresenter } from '../presenters/quality-standard-list-presenter'

interface QualityStandardsDesktopViewProps {
  standards: QualityStandardListItemPresenter[]
  onViewDetail: (standard: Standard) => void
  onEdit: (standard: Standard) => void
}

export function QualityStandardsDesktopView({
  standards,
  onViewDetail,
  onEdit,
}: QualityStandardsDesktopViewProps) {
  const { t } = useLanguage()

  return (
    <div className='relative flex flex-col overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      <div className='overflow-x-auto'>
        <Table className='min-w-[1180px] border-separate border-spacing-y-0'>
          <TableHeader className='sticky top-0 z-10 bg-muted/40 box-decoration-clone'>
            <TableRow className='border-none hover:bg-transparent'>
              <TableHead className='w-[180px] py-5 pl-8 text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.protocolId')}
              </TableHead>
              <TableHead className='w-[100px] text-center text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.version')}
              </TableHead>
              <TableHead className='text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.schemaName')}
              </TableHead>
              <TableHead className='w-[120px] text-center text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.category')}
              </TableHead>
              <TableHead className='w-[190px] text-center text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.status')}
              </TableHead>
              <TableHead className='w-[260px] text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.operatorHistory')}
              </TableHead>
              <TableHead className='w-[120px] pr-8 text-right text-[9px] font-black tracking-[0.2em] uppercase'>
                {t('quality.standards.table.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {standards.map((standard) => (
              <TableRow
                key={standard.id}
                className='group h-16 cursor-pointer border-b border-dashed border-muted/50 transition-all hover:bg-white/80'
                onClick={() => onViewDetail(standard.source)}
              >
                <TableCell className='pl-8 font-mono text-[11px] font-black text-secondary/60'>
                  {standard.code}
                </TableCell>
                <TableCell className='text-center'>
                  <div className='inline-flex h-5 items-center justify-center rounded-lg border border-primary/10 bg-primary/5 px-2 font-mono text-[9px] font-black tracking-tighter text-primary'>
                    {standard.versionText}
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex items-center gap-3'>
                    <div className='flex size-8 items-center justify-center rounded-xl bg-muted/20 transition-colors group-hover:bg-primary/10 group-hover:text-primary'>
                      <Layers className='size-4 opacity-40 group-hover:opacity-100' />
                    </div>
                    <div className='flex min-w-0 flex-col'>
                      <span className='truncate text-sm font-bold tracking-tight text-slate-700'>
                        {standard.name}
                      </span>
                      <span className='text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                        {standard.typeLabel}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className='text-center'>
                  <span className='rounded-md bg-muted/20 px-2 py-1 text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {standard.typeLabel}
                  </span>
                </TableCell>
                <TableCell className='text-center'>
                  <div className='flex flex-col items-center justify-center gap-1.5'>
                    <div
                      className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${standard.statusMeta.className}`}
                    >
                      <div
                        className={`size-1.5 rounded-full ${standard.statusMeta.dotClassName}`}
                      />
                      <span className='text-[8px] font-black tracking-widest uppercase'>
                        {standard.statusMeta.label}
                      </span>
                    </div>
                    <AuditStatusDisplay meta={standard.auditMeta} />
                    <span
                      className={`rounded-full px-2.5 py-1 text-[8px] font-black tracking-widest uppercase ${standard.approvalChainClassName}`}
                    >
                      {standard.approvalChainLabel}
                    </span>
                    {standard.processSummaryLabel &&
                    standard.processSummaryClassName ? (
                      <span
                        className={`rounded-full px-2.5 py-1 text-[8px] font-black tracking-widest uppercase ${standard.processSummaryClassName}`}
                      >
                        {standard.processSummaryLabel}
                      </span>
                    ) : null}
                    {standard.decisionSummary ? (
                      <span className='text-[8px] font-black tracking-widest text-foreground/65 uppercase'>
                        {standard.decisionSummary}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-[10px] font-black whitespace-nowrap text-slate-600 uppercase'>
                      {standard.operatorName}
                    </span>
                    <span className='font-mono text-[8px] text-muted-foreground/40 tabular-nums'>
                      {standard.operateTimeText}
                    </span>
                    {standard.decisionActor ? (
                      <span className='text-[9px] font-black whitespace-nowrap text-primary/80 uppercase'>
                        {standard.decisionActor}
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
                      showBadge={false}
                      showNote
                      noteVariant='text'
                      noteClassName='whitespace-nowrap'
                    />
                  </div>
                </TableCell>
                <TableCell className='pr-8 text-right'>
                  <div className='flex translate-x-2 items-center justify-end gap-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100'>
                    {standard.canEdit ? (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='size-9 rounded-xl transition-all hover:bg-primary/10 hover:text-primary active:scale-95'
                        onClick={(event) => {
                          event.stopPropagation()
                          onEdit(standard.source)
                        }}
                      >
                        <MoreHorizontal className='size-4' />
                      </Button>
                    ) : null}
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-9 rounded-xl transition-all hover:bg-blue-500/10 hover:text-blue-500 active:scale-95'
                      onClick={(event) => {
                        event.stopPropagation()
                        onViewDetail(standard.source)
                      }}
                    >
                      <Eye className='size-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
