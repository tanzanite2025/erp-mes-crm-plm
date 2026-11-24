import { useEffect, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import {
  Archive,
  ArrowLeft,
  CheckCheck,
  GitPullRequestArrow,
  Loader2,
  SendToBack,
  SquarePen,
  Telescope,
  XCircle,
} from 'lucide-react'
import { isForbiddenError, isNotFoundError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { QualityStandardInspectionRulesValidationError } from '../adapters/quality-standard-api-adapter'
import { QualityStandardBasicInformationInlineEditor } from '../components/quality-standard-basic-information-inline-editor'
import { QualityStandardDetailsWithInvalidInspectionRules } from '../components/quality-standard-details-with-invalid-inspection-rules'
import { StandardPreviewContent } from '../components/standard-preview-content'
import { StandardStatusActionDialog } from '../components/standard-status-action-dialog'
import { useGetQualityStandard } from '../hooks/use-quality'
import { useQualityStandardPreviewActions } from '../hooks/use-quality-standard-preview-actions'

interface StandardPreviewPageProps {
  standardId: string
  embedded?: boolean
  onClose?: () => void
  onOpenEditor?: (standardId: string) => void
  onPreviewStandardChange?: (standardId: string) => void
  onWorkflowPendingChange?: (pending: boolean) => void
  allowInlineBasicInformationEditing?: boolean
  initiallyEditingBasicInformation?: boolean
  onEditBasicInformation?: (standardId: string) => void
  onUnsavedBasicInformationChange?: (hasUnsavedChanges: boolean) => void
}

export function StandardPreviewPage({
  standardId,
  embedded = false,
  onClose,
  onOpenEditor,
  onPreviewStandardChange,
  onWorkflowPendingChange,
  allowInlineBasicInformationEditing = false,
  initiallyEditingBasicInformation = false,
  onEditBasicInformation,
  onUnsavedBasicInformationChange,
}: StandardPreviewPageProps) {
  const { t } = useLanguage()
  const [isEditingBasicInformation, setIsEditingBasicInformation] = useState(
    initiallyEditingBasicInformation
  )
  const {
    data: standard,
    isLoading,
    error,
    refetch,
  } = useGetQualityStandard(standardId)
  const {
    isWorkflowActionPending,
    availableActions,
    isApproveDialogOpen,
    setIsApproveDialogOpen,
    approveComment,
    setApproveComment,
    isRejectDialogOpen,
    setIsRejectDialogOpen,
    rejectReason,
    setRejectReason,
    isArchiveDialogOpen,
    setIsArchiveDialogOpen,
    archiveReason,
    setArchiveReason,
    handleBack,
    handleOpenEditor,
    handleOpenApproveDialog,
    handleOpenRejectDialog,
    handleOpenArchiveDialog,
    handleSubmitForApproval,
    handleApprove,
    handlePublish,
    handleReject,
    handleArchive,
    primaryActionLabel,
    handlePrimaryAction,
    showPrimaryAction,
  } = useQualityStandardPreviewActions({
    standard,
    standardId,
    onClose,
    onOpenEditor,
    onPreviewStandardChange,
  })

  useEffect(() => {
    onWorkflowPendingChange?.(isWorkflowActionPending)
  }, [isWorkflowActionPending, onWorkflowPendingChange])

  const title = t('quality.standards.workspace.previewTitle')
  const description = t('quality.standards.workspace.previewDescription')
  const closeLabel = t(
    embedded ? 'common.actions.close' : 'quality.standards.workspace.backToList'
  )

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (error instanceof QualityStandardInspectionRulesValidationError) {
    return (
      <QualityStandardDetailsWithInvalidInspectionRules
        standard={error.standardSummary}
        onReconfigureRules={handleOpenEditor}
        onClose={handleBack}
        closeLabel={closeLabel}
      />
    )
  }

  if (isLoading) {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        {!embedded ? (
          <IndustrialHeader
            icon={Telescope}
            title={title}
            description={description}
          />
        ) : null}
        <div
          className={`flex items-center justify-center rounded-[32px] border border-dashed border-muted/50 bg-muted/5 ${embedded ? 'min-h-64' : 'min-h-[60vh]'}`}
        >
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

  if (!standard) {
    const isMissing = isNotFoundError(error) || (!error && !standard)
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        {!embedded ? (
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <Button
              variant='outline'
              className='h-9 rounded-full'
              onClick={handleBack}
            >
              <ArrowLeft className='size-3.5' />
              {t('quality.standards.workspace.backToList')}
            </Button>
          </div>
        ) : null}

        {!embedded ? (
          <IndustrialHeader
            icon={Telescope}
            title={title}
            description={description}
          />
        ) : null}

        <Card className='rounded-[32px] border-dashed border-muted/50 bg-muted/5'>
          <CardHeader>
            <CardTitle>
              {isMissing
                ? t('quality.standards.workspace.previewMissingTitle')
                : t('quality.standards.workspace.previewLoadFailedTitle')}
            </CardTitle>
            <CardDescription>
              {isMissing
                ? t('quality.standards.workspace.previewMissingDescription')
                : t('quality.standards.workspace.previewLoadFailedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {embedded ? (
              <Button
                variant='outline'
                className='rounded-full'
                onClick={() => void refetch()}
              >
                {t('quality.standards.inspectionStages.retry')}
              </Button>
            ) : null}
            <Button
              variant='outline'
              className='h-9 rounded-full'
              onClick={handleBack}
            >
              <ArrowLeft className='size-3.5' />
              {closeLabel}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isEditingBasicInformation && allowInlineBasicInformationEditing) {
    return (
      <QualityStandardBasicInformationInlineEditor
        standard={standard}
        onClose={() => {
          if (initiallyEditingBasicInformation && onClose) onClose()
          else setIsEditingBasicInformation(false)
        }}
        onUnsavedChangesChange={onUnsavedBasicInformationChange}
      />
    )
  }

  return (
    <div
      className={`flex flex-col ${embedded ? 'gap-4' : 'animate-in gap-8 duration-700 fade-in'}`}
    >
      <StandardStatusActionDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        onConfirm={() => void handleApprove()}
        title={t('quality.standards.workspace.approve')}
        description={t('quality.standards.workspace.approveDescription')}
        fieldLabel={t('quality.standards.workspace.reviewCommentLabel')}
        placeholder={t('quality.standards.workspace.reviewCommentPlaceholder')}
        confirmText={t('quality.standards.workspace.approve')}
        cancelText={t('common.actions.cancel')}
        value={approveComment}
        onValueChange={setApproveComment}
        isLoading={isWorkflowActionPending}
      />

      <StandardStatusActionDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        onConfirm={() => void handleReject()}
        title={t('quality.standards.workspace.reject')}
        description={t('quality.standards.workspace.rejectDescription')}
        fieldLabel={t('quality.standards.workspace.rejectReasonLabel')}
        placeholder={t('quality.standards.workspace.rejectReasonPlaceholder')}
        confirmText={t('quality.standards.workspace.reject')}
        cancelText={t('common.actions.cancel')}
        value={rejectReason}
        onValueChange={setRejectReason}
        isLoading={isWorkflowActionPending}
        required
      />

      <StandardStatusActionDialog
        open={isArchiveDialogOpen}
        onOpenChange={setIsArchiveDialogOpen}
        onConfirm={() => void handleArchive()}
        title={t('quality.standards.workspace.archive')}
        description={t('quality.standards.workspace.archiveDescription')}
        fieldLabel={t('quality.standards.workspace.archiveReasonLabel')}
        placeholder={t('quality.standards.workspace.archiveReasonPlaceholder')}
        confirmText={t('quality.standards.workspace.archive')}
        cancelText={t('common.actions.cancel')}
        value={archiveReason}
        onValueChange={setArchiveReason}
        isLoading={isWorkflowActionPending}
        required
      />

      <div className='flex flex-wrap items-center justify-between gap-3'>
        {!embedded ? (
          <Button
            variant='outline'
            className='h-9 rounded-full'
            onClick={handleBack}
          >
            <ArrowLeft className='size-3.5' />
            {t('quality.standards.workspace.backToList')}
          </Button>
        ) : null}
        <div className='flex flex-wrap items-center gap-3'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.qualityStandard}
            targetId={standard.id}
            targetName={standard.name}
            label={t('common.audit.trigger')}
            className='h-9 rounded-full px-4'
          />
          {availableActions.canSubmitForApproval ? (
            <Button
              variant='outline'
              className='h-9 rounded-full border-dashed'
              disabled={isWorkflowActionPending}
              onClick={handleSubmitForApproval}
            >
              {isWorkflowActionPending ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <GitPullRequestArrow className='size-3.5' />
              )}
              {t('quality.standards.workspace.submitForApproval')}
            </Button>
          ) : null}
          {availableActions.canApprove ? (
            <Button
              variant='outline'
              className='h-9 rounded-full border-dashed'
              disabled={isWorkflowActionPending}
              onClick={handleOpenApproveDialog}
            >
              {isWorkflowActionPending ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <CheckCheck className='size-3.5' />
              )}
              {t('quality.standards.workspace.approve')}
            </Button>
          ) : null}
          {availableActions.canReject ? (
            <Button
              variant='outline'
              className='h-9 rounded-full border-dashed text-rose-600'
              disabled={isWorkflowActionPending}
              onClick={handleOpenRejectDialog}
            >
              {isWorkflowActionPending ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <XCircle className='size-3.5' />
              )}
              {t('quality.standards.workspace.reject')}
            </Button>
          ) : null}
          {availableActions.canPublish ? (
            <Button
              variant='outline'
              className='h-9 rounded-full border-dashed'
              disabled={isWorkflowActionPending}
              onClick={handlePublish}
            >
              {isWorkflowActionPending ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <SendToBack className='size-3.5' />
              )}
              {t('quality.standards.workspace.publish')}
            </Button>
          ) : null}
          {availableActions.canArchive ? (
            <Button
              variant='outline'
              className='h-9 rounded-full border-dashed'
              disabled={isWorkflowActionPending}
              onClick={handleOpenArchiveDialog}
            >
              {isWorkflowActionPending ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Archive className='size-3.5' />
              )}
              {t('quality.standards.workspace.archive')}
            </Button>
          ) : null}
          {availableActions.canEdit &&
          (allowInlineBasicInformationEditing || onEditBasicInformation) ? (
            <Button
              variant='outline'
              className='rounded-full'
              disabled={isWorkflowActionPending}
              onClick={() => {
                if (onEditBasicInformation) onEditBasicInformation(standardId)
                else setIsEditingBasicInformation(true)
              }}
            >
              {t('quality.standards.workspace.editBasicInformation')}
            </Button>
          ) : null}
          {availableActions.canEdit ? (
            <Button
              className='h-9 rounded-full'
              onClick={handleOpenEditor}
              disabled={isWorkflowActionPending}
            >
              <SquarePen className='size-3.5' />
              {t('quality.standards.workspace.openEditor')}
            </Button>
          ) : null}
        </div>
      </div>

      {!embedded ? (
        <IndustrialHeader
          icon={Telescope}
          title={title}
          description={description}
        />
      ) : null}

      <div
        className={`group relative flex flex-col overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-background shadow-sm ${embedded ? '' : 'min-h-[70vh]'}`}
      >
        <StandardPreviewContent
          standard={standard}
          onClose={handleBack}
          closeLabel={closeLabel}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={handlePrimaryAction}
          showPrimaryAction={showPrimaryAction && !isWorkflowActionPending}
        />
      </div>
    </div>
  )
}

export function StandardPreviewRoutePage() {
  const { standardId } = useParams({
    from: '/_authenticated/quality/standards/$standardId/preview',
  })

  return <StandardPreviewPage standardId={standardId} />
}
