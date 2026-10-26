import { useLanguage } from '@/context/language-provider'
import { Card, CardContent } from '@/components/ui/card'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import {
  getApprovalActionLabel,
  getApprovalModuleLabel,
  getApprovalStatusMeta,
} from '../approval-i18n'
import type { ApprovalRequest } from '../services/approval-service'
import { DeltaPreview } from './delta-preview'

export function ApprovalRequestRouteSelectionDetail({
  request,
  failed,
}: {
  request: ApprovalRequest | undefined
  failed: boolean
}) {
  const { t, locale } = useLanguage()
  if (failed) {
    return <p role='alert'>{t('approval.requests.selectedLoadFailed')}</p>
  }
  if (!request) {
    return <p role='status'>{t('approval.requests.selectedUnavailable')}</p>
  }
  return (
    <Card aria-label={t('approval.requests.selectedRequest')}>
      <CardContent className='space-y-3'>
        <div className='flex items-center justify-between gap-3'>
          <h3 className='font-semibold'>
            {getApprovalModuleLabel(t, request.module)} ·{' '}
            {getApprovalActionLabel(t, request.action)}
          </h3>
          <AuditStatusDisplay meta={getApprovalStatusMeta(t, request.status)} />
        </div>
        <p className='text-sm'>
          {request.reason || t('approval.requests.noReasonProvided')}
        </p>
        <p className='text-xs break-all text-muted-foreground'>
          ID: {request.targetId}
        </p>
        <p className='text-xs text-muted-foreground'>
          {t('approval.labels.createdAt')}:{' '}
          {new Date(request.createdAt).toLocaleString(locale)}
        </p>
        <DeltaPreview delta={request.delta} />
      </CardContent>
    </Card>
  )
}
