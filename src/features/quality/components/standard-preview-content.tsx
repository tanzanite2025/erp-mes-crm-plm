import * as React from 'react'
import {
  Check,
  ClipboardCheck,
  Clock3,
  Hash,
  Inbox,
  Info,
  Layers,
  MoveHorizontal,
  Plus,
  ShieldCheck,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
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
import type { Standard, StandardItem, LevelConfig } from '../data/schema'
import {
  formatQualityActorName,
  formatQualityDateTime,
  getQualityAuditMeta,
} from '../utils/quality-utils'

interface StandardPreviewContentProps {
  standard: Standard
  onClose: () => void
  closeLabel: string
  primaryActionLabel: string
  onPrimaryAction: () => void
}

function getTypeLabel(t: ReturnType<typeof useLanguage>['t'], type?: string) {
  const normalized = type?.toUpperCase()
  if (type === '巡检' || normalized === 'IPQC')
    return t('quality.standards.values.typeProcess')
  if (type === '首检' || normalized === 'FQC')
    return t('quality.standards.values.typeFinal')
  return t('quality.standards.values.typeQuality')
}

function getStatusLabel(
  t: ReturnType<typeof useLanguage>['t'],
  status?: string
) {
  const normalized = status?.toUpperCase()
  if (status === '已归档' || normalized === 'ARCHIVED')
    return t('quality.standards.values.statusArchived')
  if (status === '待审核' || normalized === 'DRAFT' || normalized === 'PENDING')
    return t('quality.standards.values.statusPending')
  if (status === '已发布' || normalized === 'PUBLISHED')
    return t('quality.standards.values.statusPublished')
  return status || t('quality.common.unknown')
}

export function StandardPreviewContent({
  standard,
  onClose,
  closeLabel,
  primaryActionLabel,
  onPrimaryAction,
}: StandardPreviewContentProps) {
  const { t, locale } = useLanguage()
  const hasItems = standard.items && standard.items.length > 0
  const operatorName = formatQualityActorName(standard.operator)
  const auditorName = formatQualityActorName(standard.auditor)
  const operateTimeText = formatQualityDateTime(standard.operateTime)
  const auditTimeText = formatQualityDateTime(standard.auditTime)
  const auditMeta = getQualityAuditMeta(
    locale,
    standard.status,
    standard.auditor
  )
  const auditTitle = locale === 'zh-CN' ? '审核履历' : 'Audit Trail'
  const auditHint =
    locale === 'zh-CN'
      ? '展示当前标准的制单、更新时间与审核确认信息，便于质量追溯与版本核对。'
      : 'Shows the current standard owner, last update, and review confirmation for quality traceability.'
  const operatorLabel = locale === 'zh-CN' ? '制单人' : 'Owner'
  const operateTimeLabel = locale === 'zh-CN' ? '更新时间' : 'Updated At'
  const auditorLabel = locale === 'zh-CN' ? '审核人' : 'Reviewer'
  const auditTimeLabel = locale === 'zh-CN' ? '审核时间' : 'Reviewed At'
  const auditPendingText = locale === 'zh-CN' ? '待审核' : 'Pending Review'

  return (
    <>
      <div className='absolute top-0 left-0 z-50 h-1 w-full bg-linear-to-r from-primary/20 via-primary/60 to-primary/20 transition-opacity' />

      <div className='shrink-0 space-y-4 border-b border-white/5 bg-muted/20 p-4 pt-6 lg:p-6 lg:pt-8'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center gap-3 lg:gap-4'>
            <div className='scale-90 rounded-xl border border-primary/20 bg-primary/10 p-2.5 shadow-inner lg:scale-100 lg:rounded-2xl lg:p-3.5'>
              <ClipboardCheck className='size-5 text-primary lg:size-8' />
            </div>
            <div className='min-w-0'>
              <h2 className='flex items-center gap-2 truncate text-lg font-black tracking-tighter uppercase lg:gap-3 lg:text-2xl'>
                {t('quality.standards.dialog.detail.title')}
                <span className='font-thin text-muted-foreground/30'>|</span>
                <span className='truncate text-primary'>{standard.code}</span>
              </h2>
              <p className='truncate text-[9px] font-bold tracking-[0.2em] text-muted-foreground uppercase opacity-40 lg:text-[10px]'>
                {t('quality.standards.dialog.detail.subtitle')}
              </p>
            </div>
          </div>
          <div className='flex shrink-0 items-center gap-3 rounded-xl border border-white/5 bg-background/40 p-1.5'>
            <Badge className='rounded-lg border-none bg-emerald-500/10 px-3 py-1 text-[9px] font-black tracking-widest text-emerald-500 uppercase lg:px-4 lg:text-[10px]'>
              {getStatusLabel(t, standard.status)}
            </Badge>
            <div className='h-3 w-px bg-white/10' />
            <span className='px-2 text-[9px] font-black text-muted-foreground uppercase opacity-60 lg:text-[10px]'>
              VERSION {standard.version.toFixed(1)}
            </span>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4'>
          <InfoCard
            icon={Hash}
            label={t('quality.standards.dialog.detail.fields.code')}
            value={standard.code}
          />
          <InfoCard
            icon={Layers}
            label={t('quality.standards.dialog.detail.fields.name')}
            value={standard.name}
            className='sm:col-span-2'
          />
          <InfoCard
            icon={Info}
            label={t('quality.standards.dialog.detail.fields.type')}
            value={getTypeLabel(t, standard.type)}
            highlight
          />
        </div>

        <div className='rounded-2xl border border-dashed border-white/10 bg-background/50 p-4 shadow-inner lg:p-5'>
          <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='text-[9px] font-black tracking-[0.3em] text-muted-foreground/50 uppercase lg:text-[10px]'>
                {auditTitle}
              </p>
              <p className='mt-1 text-[10px] leading-5 font-medium text-muted-foreground/60'>
                {auditHint}
              </p>
            </div>
            <div className='mt-3 flex flex-wrap items-center gap-2 sm:mt-0 sm:justify-end'>
              <Badge
                variant='outline'
                className='w-fit rounded-full border-dashed bg-muted/20 px-3 py-1 text-[9px] font-black tracking-widest uppercase'
              >
                {getStatusLabel(t, standard.status)}
              </Badge>
              <AuditStatusDisplay meta={auditMeta} />
            </div>
          </div>

          <AuditStatusDisplay meta={auditMeta} showNote className='mt-3' />

          <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
            <InfoCard
              icon={User}
              label={operatorLabel}
              value={operatorName || t('quality.common.system')}
            />
            <InfoCard
              icon={Clock3}
              label={operateTimeLabel}
              value={operateTimeText || '-'}
            />
            <InfoCard
              icon={ShieldCheck}
              label={auditorLabel}
              value={auditorName || auditPendingText}
            />
            <InfoCard
              icon={Clock3}
              label={auditTimeLabel}
              value={auditTimeText || '-'}
            />
          </div>
        </div>
      </div>

      <div className='relative flex min-h-0 flex-1 flex-col overflow-hidden bg-muted/5'>
        {hasItems ? (
          <>
            <div className='pointer-events-none absolute right-6 bottom-6 z-40 animate-bounce rounded-full border border-primary/50 bg-primary/40 p-2.5 shadow-2xl backdrop-blur-md transition-opacity lg:opacity-0 group-hover:lg:opacity-100'>
              <MoveHorizontal className='size-4 text-white' />
            </div>

            <div className='scrollbar-thin flex-1 overflow-auto p-4 lg:p-6 lg:pt-4'>
              <Table className='min-w-[1650px] border-separate border-spacing-0'>
                <TableHeader className='sticky top-0 z-30 bg-background/95 backdrop-blur-xl'>
                  <TableRow className='hover:bg-transparent'>
                    <TableHead className='sticky left-0 z-40 h-12 w-[180px] border border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:h-14 lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.item')}
                      <div className='absolute right-0 bottom-0 h-full w-px bg-white/10' />
                    </TableHead>
                    <TableHead className='w-[80px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.order')}
                    </TableHead>
                    <TableHead className='w-[100px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.centerValue')}
                    </TableHead>
                    <TableHead className='w-[90px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.level')}
                    </TableHead>
                    <TableHead className='w-[110px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.tolerance')}
                    </TableHead>
                    <TableHead className='w-[110px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.min')}
                    </TableHead>
                    <TableHead className='w-[110px] border border-l-0 border-white/10 bg-primary/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-primary uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.max')}
                    </TableHead>
                    <TableHead className='w-[130px] border border-l-0 border-white/10 bg-red-500/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-red-500 uppercase lg:text-[10px]'>
                      {t(
                        'quality.standards.dialog.detail.table.errorCodeLower'
                      )}
                    </TableHead>
                    <TableHead className='w-[130px] border border-l-0 border-white/10 bg-red-500/5 text-center text-[9px] font-black tracking-widest whitespace-nowrap text-red-500 uppercase lg:text-[10px]'>
                      {t(
                        'quality.standards.dialog.detail.table.errorCodeUpper'
                      )}
                    </TableHead>
                    <TableHead className='w-[80px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.unit')}
                    </TableHead>
                    <TableHead className='w-[90px] border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-widest whitespace-nowrap uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.required')}
                    </TableHead>
                    <TableHead className='border border-l-0 border-white/10 bg-muted/40 text-center text-[9px] font-black tracking-[0.2em] whitespace-nowrap uppercase lg:text-[10px]'>
                      {t('quality.standards.dialog.detail.table.remarks')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standard.items.map((item: StandardItem) => (
                    <React.Fragment key={item.id}>
                      <TableRow className='group h-14 transition-colors'>
                        <TableCell
                          rowSpan={item.levels.length}
                          className='sticky left-0 z-20 border border-t-0 border-white/10 bg-muted/10 px-4 text-center text-[11px] font-black whitespace-nowrap shadow-[4px_0_12px_-4px_rgba(0,0,0,0.1)] backdrop-blur group-hover:bg-muted/20 lg:text-xs'
                        >
                          {item.name}
                          <div className='absolute right-0 bottom-0 h-full w-px bg-white/20 shadow-[2px_0_8px_rgba(0,0,0,0.2)]' />
                        </TableCell>
                        <TableCell
                          rowSpan={item.levels.length}
                          className='border border-t-0 border-l-0 border-white/10 text-center font-mono text-[9px] whitespace-nowrap opacity-40 lg:text-[10px]'
                        >
                          {item.order}
                        </TableCell>
                        <TableCell
                          rowSpan={item.levels.length}
                          className='border border-t-0 border-l-0 border-white/10 bg-muted/5 text-center text-[11px] font-black whitespace-nowrap lg:text-xs'
                        >
                          {item.centerValue?.toFixed(2)}
                        </TableCell>
                        <LevelRow
                          level={item.levels[0]}
                          remarks={item.remarks}
                          unit={item.unit}
                          isRequired={item.isRequired}
                          t={t}
                          rowSpan={item.levels.length}
                        />
                      </TableRow>
                      {item.levels.slice(1).map((level: LevelConfig) => (
                        <TableRow
                          key={`${item.id}-${level.level}`}
                          className='group h-10 transition-colors'
                        >
                          <LevelCells level={level} />
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className='flex flex-1 animate-in flex-col items-center justify-center p-10 text-center duration-500 zoom-in-95 fade-in'>
            <div className='group relative mb-6 rounded-[2.5rem] border border-dashed border-white/10 bg-background/50 p-6 shadow-2xl'>
              <Inbox className='size-16 text-muted-foreground/10 transition-colors duration-500 group-hover:text-primary/10 lg:size-24' />
              <ShieldCheck className='absolute top-1/2 left-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-primary/20 lg:size-10' />
            </div>
            <h3 className='mb-2 text-base font-black tracking-tight uppercase lg:text-xl'>
              {t('quality.standards.dialog.detail.emptyTitle')}
            </h3>
            <p className='max-w-xs text-[10px] leading-relaxed font-medium text-muted-foreground opacity-50 lg:text-xs'>
              {t('quality.standards.dialog.detail.emptyDescription', {
                code: standard.code,
              })}
            </p>
            <div className='mt-8'>
              <Button
                className='h-9 rounded-xl bg-primary/10 px-6 text-[10px] font-black text-primary uppercase shadow-xl transition-all hover:bg-primary hover:text-primary-foreground'
                onClick={onPrimaryAction}
              >
                <Plus className='mr-2 size-3.5' />
                {t('quality.standards.dialog.detail.startEditing')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className='shrink-0 rounded-b-2xl border-t border-white/5 bg-muted/40 p-4 lg:rounded-b-[2.5rem] lg:p-6'>
        <div className='flex flex-col items-center justify-between gap-4 sm:flex-row'>
          <div className='flex items-center gap-3'>
            <div className='size-1.5 animate-pulse rounded-full bg-primary/40' />
            <span className='text-[8px] font-black tracking-[0.3em] text-muted-foreground uppercase italic opacity-40 lg:text-[9px]'>
              {t('quality.standards.dialog.detail.footerHint')}
            </span>
          </div>
          <div className='flex w-full gap-2 sm:w-auto lg:gap-3'>
            <Button
              variant='ghost'
              className='h-10 flex-1 rounded-xl px-6 text-[10px] font-black uppercase opacity-50 transition-opacity hover:bg-white/5 lg:h-11 lg:flex-none lg:text-xs'
              onClick={onClose}
            >
              {closeLabel}
            </Button>
            <Button
              className='h-10 flex-1 rounded-xl bg-primary px-8 text-[10px] font-black text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 lg:h-11 lg:flex-none lg:px-12 lg:text-xs'
              onClick={onPrimaryAction}
            >
              <Check className='mr-2 size-3.5 lg:size-4' />
              {primaryActionLabel}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  className,
  highlight = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: string
  className?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border border-white/5 bg-background/60 p-2.5 shadow-sm lg:rounded-2xl lg:p-3',
        className
      )}
    >
      <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 lg:size-10 lg:rounded-xl'>
        <Icon className='size-3 text-primary/40 lg:size-4' />
      </div>
      <div className='min-w-0'>
        <p className='text-[8px] font-black tracking-widest text-muted-foreground/50 uppercase lg:text-[9px]'>
          {label}
        </p>
        <p
          className={cn(
            'truncate text-xs font-bold tracking-tight lg:text-sm',
            highlight && 'tracking-wider text-primary uppercase'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

function LevelRow({
  level,
  remarks,
  unit,
  isRequired,
  t,
  rowSpan,
}: {
  level: LevelConfig
  remarks?: string
  unit?: string
  isRequired?: boolean
  t: ReturnType<typeof useLanguage>['t']
  rowSpan: number
}) {
  return (
    <>
      <LevelCells level={level} />
      <TableCell
        rowSpan={rowSpan}
        className='border border-t-0 border-l-0 border-white/10 px-1 text-center text-[9px] font-black whitespace-nowrap opacity-50 lg:text-[10px]'
      >
        {unit}
      </TableCell>
      <TableCell
        rowSpan={rowSpan}
        className='border border-t-0 border-l-0 border-white/10 text-center whitespace-nowrap'
      >
        <Badge
          variant={isRequired ? 'default' : 'outline'}
          className='rounded-md px-1.5 py-0 text-[8px] font-black lg:text-[9px]'
        >
          {isRequired
            ? t('quality.standards.dialog.detail.yes')
            : t('quality.standards.dialog.detail.no')}
        </Badge>
      </TableCell>
      <TableCell
        rowSpan={rowSpan}
        className='border border-t-0 border-l-0 border-white/10 p-3 text-[9px] leading-relaxed font-medium whitespace-nowrap text-muted-foreground italic opacity-70 lg:text-[10px]'
      >
        {remarks || t('quality.standards.dialog.detail.noRemarks')}
      </TableCell>
    </>
  )
}

function LevelCells({ level }: { level: LevelConfig }) {
  return (
    <>
      <TableCell
        className={cn(
          'border border-t-0 border-l-0 border-white/10 px-2 text-center text-[10px] font-black whitespace-nowrap lg:text-[11px]',
          level.level === 'B' && 'border-primary/30 bg-primary/20 text-primary'
        )}
      >
        {level.level}
      </TableCell>
      <TableCell
        className={cn(
          'border border-t-0 border-l-0 border-white/10 text-center text-[10px] font-bold whitespace-nowrap lg:text-[11px]',
          level.level === 'B' && 'bg-primary/5'
        )}
      >
        {level.tolerance?.toFixed(3)}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 text-center text-[10px] font-black whitespace-nowrap lg:text-[11px]'>
        {level.min?.toFixed(3)}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 text-center text-[10px] font-black whitespace-nowrap lg:text-[11px]'>
        {level.max?.toFixed(3)}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 px-1 text-center text-[9px] font-black whitespace-nowrap text-red-500/80'>
        {level.errorCodeLower || '-'}
      </TableCell>
      <TableCell className='border border-t-0 border-l-0 border-white/10 px-1 text-center text-[9px] font-black whitespace-nowrap text-red-500/80'>
        {level.errorCodeUpper || '-'}
      </TableCell>
    </>
  )
}
