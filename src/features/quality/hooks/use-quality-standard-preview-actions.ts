import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import type { Standard } from '../data/schema'
import { dispatchQualityStandardRoutingEvent } from '../services/quality-routing-service'
import {
  buildQualityStandardWorkflowMutation,
  type QualityStandardWorkflowActionInput,
} from '../services/quality-standard-workflow-service'
import { getQualityStandardAvailableActions } from '../utils/quality-utils'
import { useQualityMutations } from './use-quality'

interface UseQualityStandardPreviewActionsOptions {
  standard?: Standard
  standardId: string
}

export function useQualityStandardPreviewActions({
  standard,
  standardId,
}: UseQualityStandardPreviewActionsOptions) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { saveStandardMutation } = useQualityMutations()
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')

  const availableActions = useMemo(
    () => getQualityStandardAvailableActions(standard?.status),
    [standard?.status]
  )

  const navigateToPreview = useCallback(
    (nextStandardId: string) => {
      navigate({
        to: '/quality/standards/$standardId/preview',
        params: { standardId: nextStandardId },
      })
    },
    [navigate]
  )

  const handleBack = useCallback(() => {
    navigate({ to: '/quality/standards' })
  }, [navigate])

  const handleOpenEditor = useCallback(() => {
    navigate({
      to: '/quality/standards/$standardId/edit',
      params: { standardId },
    })
  }, [navigate, standardId])

  const runWorkflowAction = useCallback(
    async (
      action: QualityStandardWorkflowActionInput,
      successMessage: string
    ): Promise<Standard | null> => {
      if (!standard) {
        return null
      }

      const mutation = buildQualityStandardWorkflowMutation(standard, action)

      try {
        const saved = await saveStandardMutation.mutateAsync({
          data: mutation.data,
          isPatch: true,
          delta: mutation.delta,
          successMessage,
        })

        await dispatchQualityStandardRoutingEvent({
          standard: saved,
          semanticAction: mutation.semanticAction,
          previousStatus: standard.status,
        })

        navigateToPreview(saved.id)
        return saved
      } catch {
        return null
      }
    },
    [navigateToPreview, saveStandardMutation, standard]
  )

  const handleOpenApproveDialog = useCallback(() => {
    setApproveComment(standard?.reviewComment || '')
    setIsApproveDialogOpen(true)
  }, [standard?.reviewComment])

  const handleOpenRejectDialog = useCallback(() => {
    setRejectReason(standard?.rejectReason || '')
    setIsRejectDialogOpen(true)
  }, [standard?.rejectReason])

  const handleOpenArchiveDialog = useCallback(() => {
    setArchiveReason(standard?.archiveReason || '')
    setIsArchiveDialogOpen(true)
  }, [standard?.archiveReason])

  const handleSubmitForApproval = useCallback(async () => {
    if (!standard || !availableActions.canSubmitForApproval) {
      return
    }

    await runWorkflowAction(
      { type: 'submitForApproval' },
      t('quality.hooks.submitForApprovalSuccess')
    )
  }, [availableActions.canSubmitForApproval, runWorkflowAction, standard, t])

  const handleApprove = useCallback(async () => {
    if (!standard || !availableActions.canApprove) {
      return
    }

    const saved = await runWorkflowAction(
      { type: 'approve', reviewComment: approveComment },
      t('quality.hooks.approveStandardSuccess')
    )

    if (saved) {
      setIsApproveDialogOpen(false)
    }
  }, [
    approveComment,
    availableActions.canApprove,
    runWorkflowAction,
    standard,
    t,
  ])

  const handleReject = useCallback(async () => {
    if (!standard || !availableActions.canReject) {
      return
    }

    const saved = await runWorkflowAction(
      { type: 'reject', rejectReason },
      t('quality.hooks.rejectStandardSuccess')
    )

    if (saved) {
      setIsRejectDialogOpen(false)
    }
  }, [availableActions.canReject, rejectReason, runWorkflowAction, standard, t])

  const handlePublish = useCallback(async () => {
    if (!standard || !availableActions.canPublish) {
      return
    }

    await runWorkflowAction(
      { type: 'publish' },
      t('quality.hooks.publishStandardSuccess')
    )
  }, [availableActions.canPublish, runWorkflowAction, standard, t])

  const handleArchive = useCallback(async () => {
    if (!standard || !availableActions.canArchive) {
      return
    }

    const saved = await runWorkflowAction(
      { type: 'archive', archiveReason },
      t('quality.hooks.archiveStandardSuccess')
    )

    if (saved) {
      setIsArchiveDialogOpen(false)
    }
  }, [
    archiveReason,
    availableActions.canArchive,
    runWorkflowAction,
    standard,
    t,
  ])

  const primaryActionLabel = availableActions.canApprove
    ? t('quality.standards.workspace.approve')
    : availableActions.canReject
      ? t('quality.standards.workspace.reject')
      : availableActions.canPublish
        ? t('quality.standards.workspace.publish')
        : availableActions.canArchive
          ? t('quality.standards.workspace.archive')
          : t('quality.standards.workspace.openEditor')

  const handlePrimaryAction = availableActions.canApprove
    ? handleOpenApproveDialog
    : availableActions.canReject
      ? handleOpenRejectDialog
      : availableActions.canPublish
        ? handlePublish
        : availableActions.canArchive
          ? handleOpenArchiveDialog
          : handleOpenEditor

  const showPrimaryAction =
    availableActions.canEdit ||
    availableActions.canApprove ||
    availableActions.canReject ||
    availableActions.canPublish ||
    availableActions.canArchive

  return {
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
    handleReject,
    handlePublish,
    handleArchive,
    primaryActionLabel,
    handlePrimaryAction,
    showPrimaryAction,
  }
}
