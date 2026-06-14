import { Clock3, Info, ShieldCheck, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import type { Standard } from '../data/schema'
import {
  formatQualityActorName,
  formatQualityDateTime,
  getQualityAuditMeta,
  getQualityStandardStatusLabel,
} from '../utils/quality-utils'
import { StandardPreviewInfoCard } from './standard-preview-info-card'

interface StandardPreviewAuditPanelProps {
  standard: Standard
}

export function StandardPreviewAuditPanel({
  standard,
}: StandardPreviewAuditPanelProps) {
  const { t, locale } = useLanguage()
  const operatorName = formatQualityActorName(standard.operator)
  const auditorName = formatQualityActorName(standard.auditor)
  const operateTimeText = formatQualityDateTime(standard.operateTime)
  const auditTimeText = formatQualityDateTime(standard.auditTime)
  const reviewComment = standard.reviewComment?.trim()
  const rejectReason = standard.rejectReason?.trim()
  const archiveReason = standard.archiveReason?.trim()
  const publishedByText = formatQualityActorName(standard.publishedBy)
  const publishedAtText = formatQualityDateTime(standard.publishedAt)
  const archivedByText = formatQualityActorName(standard.archivedBy)
  const archivedAtText = formatQualityDateTime(standard.archivedAt)
  const auditMeta = getQualityAuditMeta(
    locale,
    standard.status,
    standard.auditor
  )
  const hasDecisionDetails = Boolean(
    reviewComment ||
    rejectReason ||
    archiveReason ||
    publishedByText ||
    publishedAtText ||
    archivedByText ||
    archivedAtText
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
            {getQualityStandardStatusLabel(t, standard.status)}
          </Badge>
          <AuditStatusDisplay meta={auditMeta} />
        </div>
      </div>

      <AuditStatusDisplay meta={auditMeta} showNote className='mt-3' />

      <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
        <StandardPreviewInfoCard
          icon={User}
          label={operatorLabel}
          value={operatorName || t('quality.common.system')}
        />
        <StandardPreviewInfoCard
          icon={Clock3}
          label={operateTimeLabel}
          value={operateTimeText || '-'}
        />
        <StandardPreviewInfoCard
          icon={ShieldCheck}
          label={auditorLabel}
          value={auditorName || auditPendingText}
        />
        <StandardPreviewInfoCard
          icon={Clock3}
          label={auditTimeLabel}
          value={auditTimeText || '-'}
        />
      </div>

      {hasDecisionDetails ? (
        <div className='mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4'>
          {reviewComment ? (
            <StandardPreviewInfoCard
              icon={Info}
              label={t('quality.standards.dialog.detail.fields.reviewComment')}
              value={reviewComment}
              className='md:col-span-2 xl:col-span-4'
              valueClassName='whitespace-pre-wrap break-words text-[11px] leading-6 lg:text-xs'
            />
          ) : null}
          {rejectReason ? (
            <StandardPreviewInfoCard
              icon={Info}
              label={t('quality.standards.dialog.detail.fields.rejectReason')}
              value={rejectReason}
              className='md:col-span-2 xl:col-span-4'
              valueClassName='whitespace-pre-wrap break-words text-[11px] leading-6 lg:text-xs'
            />
          ) : null}
          {archiveReason ? (
            <StandardPreviewInfoCard
              icon={Info}
              label={t('quality.standards.dialog.detail.fields.archiveReason')}
              value={archiveReason}
              className='md:col-span-2 xl:col-span-4'
              valueClassName='whitespace-pre-wrap break-words text-[11px] leading-6 lg:text-xs'
            />
          ) : null}
          {publishedByText ? (
            <StandardPreviewInfoCard
              icon={User}
              label={t('quality.standards.dialog.detail.fields.publishedBy')}
              value={publishedByText}
            />
          ) : null}
          {publishedAtText ? (
            <StandardPreviewInfoCard
              icon={Clock3}
              label={t('quality.standards.dialog.detail.fields.publishedAt')}
              value={publishedAtText}
            />
          ) : null}
          {archivedByText ? (
            <StandardPreviewInfoCard
              icon={User}
              label={t('quality.standards.dialog.detail.fields.archivedBy')}
              value={archivedByText}
            />
          ) : null}
          {archivedAtText ? (
            <StandardPreviewInfoCard
              icon={Clock3}
              label={t('quality.standards.dialog.detail.fields.archivedAt')}
              value={archivedAtText}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
