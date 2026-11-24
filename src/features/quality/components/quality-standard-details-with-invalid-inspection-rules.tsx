import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import type { QualityStandardListSummary } from '../adapters/quality-standard-api-adapter'
import { getQualityStandardAvailableActions } from '../utils/quality-utils'
import { StandardPreviewAuditPanel } from './standard-preview-audit-panel'
import { StandardPreviewHero } from './standard-preview-hero'

export function QualityStandardDetailsWithInvalidInspectionRules({
  standard,
  onReconfigureRules,
  onClose,
  closeLabel,
}: {
  standard: QualityStandardListSummary
  onReconfigureRules: () => void
  onClose: () => void
  closeLabel: string
}) {
  const { t } = useLanguage()
  const canReconfigureRules = getQualityStandardAvailableActions(
    standard.status
  ).canEdit
  return (
    <div className='space-y-4'>
      <StandardPreviewHero standard={standard} />
      <StandardPreviewAuditPanel standard={standard} />
      {standard.remarks ? (
        <p className='rounded-2xl border p-4 text-[13px] leading-5 break-words whitespace-pre-wrap'>
          {standard.remarks}
        </p>
      ) : null}
      <section
        role='alert'
        className='space-y-2 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5'
      >
        <h3 className='text-sm font-semibold'>
          {t(
            'quality.standards.workspace.inspectionRulesNeedConfigurationTitle'
          )}
        </h3>
        <p className='text-[13px] leading-5 text-muted-foreground'>
          {t(
            'quality.standards.workspace.inspectionRulesNeedConfigurationDescription'
          )}
        </p>
        {!canReconfigureRules ? (
          <p className='text-[13px] leading-5 text-muted-foreground'>
            {t(
              'quality.standards.workspace.inspectionRulesReconfigurationReadOnly'
            )}
          </p>
        ) : null}
      </section>
      <div className='flex flex-wrap items-center justify-end gap-2 border-t pt-4'>
        <AuditTimelineTriggerButton
          module={AUDIT_MODULES.qualityStandard}
          targetId={standard.id}
          targetName={standard.name}
          label={t('common.audit.trigger')}
          className='rounded-full'
        />
        <Button variant='outline' className='rounded-full' onClick={onClose}>
          {closeLabel}
        </Button>
        {canReconfigureRules ? (
          <Button className='rounded-full' onClick={onReconfigureRules}>
            {t('quality.standards.workspace.reconfigureInspectionRules')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
