import { useParams } from '@tanstack/react-router'
import { ArrowLeft, Eye, GitPullRequestArrow, Loader2, Save, SquarePen } from 'lucide-react'
import { isForbiddenError, isNotFoundError } from '@/lib/error-status'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { StandardEditorContent } from '../components/standard-editor-content'
import { useQualityStandardEditorActions } from '../hooks/use-quality-standard-editor-actions'
import { useGetQualityStandard } from '../hooks/use-quality'
import { useStandardEditorForm } from '../hooks/use-standard-editor-form'
import {
  getQualityStandardAvailableActions,
} from '../utils/quality-utils'

interface StandardEditorPageProps {
  mode: 'create' | 'edit'
  standardId?: string
}

export function StandardEditorPage({
  mode,
  standardId,
}: StandardEditorPageProps) {
  const { t } = useLanguage()
  const isEdit = mode === 'edit'
  const {
    data: standard,
    isLoading,
    error,
  } = useGetQualityStandard(isEdit ? standardId || '' : '')
  const {
    formData,
    updateField,
    buildSubmitPayload,
    buildSubmitPayloadWithOverrides,
    isDirty,
  } =
    useStandardEditorForm({
      initialStandard: isEdit ? standard : null,
      resetKey: isEdit
        ? `quality-standard-${standardId || 'missing'}-${standard?.version || 'loading'}`
        : 'quality-standard-create',
      mode,
    })
  const availableActions = getQualityStandardAvailableActions(
    isEdit ? standard?.status : formData.status
  )
  const isReadOnly = isEdit && Boolean(standard) ? availableActions.isReadOnly : false
  const {
    saveStandardMutation,
    handleBack,
    handleOpenPreview,
    handleSave,
    handleSubmitForApproval,
  } = useQualityStandardEditorActions({
    mode,
    standardId,
    standard,
    formData,
    isDirty,
    isReadOnly,
    buildSubmitPayload,
    buildSubmitPayloadWithOverrides,
  })

  const title = isEdit
    ? t('quality.standards.workspace.editorEditTitle')
    : t('quality.standards.workspace.editorCreateTitle')
  const description = isEdit
    ? t('quality.standards.workspace.editorEditDescription')
    : t('quality.standards.workspace.editorCreateDescription')

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isEdit && isLoading) {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader icon={SquarePen} title={title} description={description} />
        <div className='flex min-h-[60vh] items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5'>
          <div className='flex flex-col items-center gap-3 text-muted-foreground'>
            <Loader2 className='size-8 animate-spin text-primary' />
            <span className='text-[10px] font-black tracking-widest uppercase'>
              {t('common.actions.loading')}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (isEdit && (error || !standard)) {
    const isMissing = isNotFoundError(error) || !standard

    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <Button
            variant='outline'
            className='rounded-full'
            onClick={handleBack}
          >
            <ArrowLeft className='mr-2 size-4' />
            {t('quality.standards.workspace.backToList')}
          </Button>
        </div>

        <IndustrialHeader icon={SquarePen} title={title} description={description} />

        <Card className='rounded-[32px] border-dashed border-muted/50 bg-muted/5'>
          <CardHeader>
            <CardTitle>
              {isMissing
                ? t('quality.standards.workspace.editorMissingTitle')
                : t('quality.standards.workspace.editorLoadFailedTitle')}
            </CardTitle>
            <CardDescription>
              {isMissing
                ? t('quality.standards.workspace.editorMissingDescription')
                : t('quality.standards.workspace.editorLoadFailedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant='outline'
              className='rounded-full'
              onClick={handleBack}
            >
              <ArrowLeft className='mr-2 size-4' />
              {t('quality.standards.workspace.backToList')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button variant='outline' className='rounded-full' onClick={handleBack}>
          <ArrowLeft className='mr-2 size-4' />
          {t('quality.standards.workspace.backToList')}
        </Button>
        <div className='flex flex-wrap items-center gap-3'>
          {isEdit && standard ? (
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.qualityStandard}
              targetId={standard.id}
              targetName={standard.name}
              label={t('common.audit.trigger')}
              className='h-10 rounded-full px-4'
            />
          ) : null}
          {isEdit ? (
            <Button className='rounded-full' onClick={handleOpenPreview}>
              <Eye className='mr-2 size-4' />
              {t('quality.standards.workspace.backToPreview')}
            </Button>
          ) : null}
        </div>
      </div>

      <IndustrialHeader icon={SquarePen} title={title} description={description} />

      <div className='rounded-[32px] border border-dashed border-muted/50 bg-background p-6 shadow-sm lg:p-8'>
        <StandardEditorContent
          mode={mode}
          formData={formData}
          isDirty={isDirty}
          readOnly={isReadOnly}
          onCodeChange={(value) => updateField('code', value)}
          onNameChange={(value) => updateField('name', value)}
          onTypeChange={(value) => updateField('type', value)}
          onRemarksChange={(value) => updateField('remarks', value)}
        />

        <div className='mt-8 flex flex-col-reverse gap-3 border-t border-dashed border-muted/50 pt-6 sm:flex-row sm:items-center sm:justify-end'>
          <Button
            variant='outline'
            className='rounded-full'
            onClick={isEdit ? handleOpenPreview : handleBack}
          >
            <ArrowLeft className='mr-2 size-4' />
            {isEdit
              ? t('quality.standards.workspace.backToPreview')
              : t('quality.standards.workspace.backToList')}
          </Button>
          {availableActions.canSubmitForApproval ? (
            <Button
              variant='outline'
              className='rounded-full border-dashed'
              disabled={saveStandardMutation.isPending}
              onClick={handleSubmitForApproval}
            >
              {saveStandardMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <GitPullRequestArrow className='mr-2 size-4' />
              )}
              {t('quality.standards.workspace.submitForApproval')}
            </Button>
          ) : null}
          {!isReadOnly ? (
            <Button
              className='rounded-full'
              disabled={saveStandardMutation.isPending}
              onClick={handleSave}
            >
              {saveStandardMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Save className='mr-2 size-4' />
              )}
              {t('quality.standards.dialog.action.save')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function CreateStandardEditorRoutePage() {
  return <StandardEditorPage mode='create' />
}

export function EditStandardEditorRoutePage() {
  const { standardId } = useParams({
    from: '/_authenticated/quality/standards/$standardId/edit',
  })

  return <StandardEditorPage mode='edit' standardId={standardId} />
}
