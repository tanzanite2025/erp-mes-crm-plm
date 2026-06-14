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
import { StandardPreviewContent } from '../components/standard-preview-content'
import { StandardStatusActionDialog } from '../components/standard-status-action-dialog'
import { useGetQualityStandard } from '../hooks/use-quality'
import { useQualityStandardPreviewActions } from '../hooks/use-quality-standard-preview-actions'

interface StandardPreviewPageProps {
  standardId: string
}

export function StandardPreviewPage({ standardId }: StandardPreviewPageProps) {
  const { t } = useLanguage()
  const { data: standard, isLoading, error } = useGetQualityStandard(standardId)
  const {
    saveStandardMutation,
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
  } = useQualityStandardPreviewActions({ standard, standardId })

  const title = t('quality.standards.workspace.previewTitle')
  const description = t('quality.standards.workspace.previewDescription')

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
        <IndustrialHeader
          icon={Telescope}
          title={title}
          description={description}
        />
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

  if (error || !standard) {
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

        <IndustrialHeader
          icon={Telescope}
          title={title}
          description={description}
        />

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
        isLoading={saveStandardMutation.isPending}
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
        isLoading={saveStandardMutation.isPending}
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
        isLoading={saveStandardMutation.isPending}
        required
      />

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button variant='outline' className='rounded-full' onClick={handleBack}>
          <ArrowLeft className='mr-2 size-4' />
          {t('quality.standards.workspace.backToList')}
        </Button>
        <div className='flex flex-wrap items-center gap-3'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.qualityStandard}
            targetId={standard.id}
            targetName={standard.name}
            label={t('common.audit.trigger')}
            className='h-10 rounded-full px-4'
          />
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
          {availableActions.canApprove ? (
            <Button
              variant='outline'
              className='rounded-full border-dashed'
              disabled={saveStandardMutation.isPending}
              onClick={handleOpenApproveDialog}
            >
              {saveStandardMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <CheckCheck className='mr-2 size-4' />
              )}
              {t('quality.standards.workspace.approve')}
            </Button>
          ) : null}
          {availableActions.canReject ? (
            <Button
              variant='outline'
              className='rounded-full border-dashed text-rose-600'
              disabled={saveStandardMutation.isPending}
              onClick={handleOpenRejectDialog}
            >
              {saveStandardMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <XCircle className='mr-2 size-4' />
              )}
              {t('quality.standards.workspace.reject')}
            </Button>
          ) : null}
          {availableActions.canPublish ? (
            <Button
              variant='outline'
              className='rounded-full border-dashed'
              disabled={saveStandardMutation.isPending}
              onClick={handlePublish}
            >
              {saveStandardMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <SendToBack className='mr-2 size-4' />
              )}
              {t('quality.standards.workspace.publish')}
            </Button>
          ) : null}
          {availableActions.canArchive ? (
            <Button
              variant='outline'
              className='rounded-full border-dashed'
              disabled={saveStandardMutation.isPending}
              onClick={handleOpenArchiveDialog}
            >
              {saveStandardMutation.isPending ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : (
                <Archive className='mr-2 size-4' />
              )}
              {t('quality.standards.workspace.archive')}
            </Button>
          ) : null}
          {availableActions.canEdit ? (
            <Button className='rounded-full' onClick={handleOpenEditor}>
              <SquarePen className='mr-2 size-4' />
              {t('quality.standards.workspace.openEditor')}
            </Button>
          ) : null}
        </div>
      </div>

      <IndustrialHeader
        icon={Telescope}
        title={title}
        description={description}
      />

      <div className='group relative flex min-h-[70vh] flex-col overflow-hidden rounded-[32px] border border-dashed border-muted/50 bg-background shadow-sm'>
        <StandardPreviewContent
          standard={standard}
          onClose={handleBack}
          closeLabel={t('quality.standards.workspace.backToList')}
          primaryActionLabel={primaryActionLabel}
          onPrimaryAction={handlePrimaryAction}
          showPrimaryAction={showPrimaryAction}
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
