import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { ApprovalService } from '@/features/approval/services/approval-service'
import type { Standard } from '../data/schema'
import { QualityCoreService } from '../services/quality-core-service'
import {
  QualityStandardApprovalResponseNotConfirmedError,
  submitQualityStandardWithConfirmedApprovalRequest,
} from '../services/quality-standard-approval-submission-service'
import {
  buildQualityStandardWorkflowMutation,
  type QualityStandardWorkflowActionInput,
  type QualityStandardReviewDecisionInput,
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
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const currentUserId = useAuthStore((state) => state.user?.id)
  const { saveStandardMutation } = useQualityMutations()
  const {
    mutateAsync: submitReviewDecision,
    isPending: isReviewDecisionPending,
  } = useMutation({
    mutationFn: (decision: {
      requestId: string
      status: 'APPROVED' | 'REJECTED'
      comment?: string
    }) => ApprovalService.approveRequest(decision.requestId, decision),
  })
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [approveComment, setApproveComment] = useState('')
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')

  const availableActions = useMemo(() => {
    const actions = getQualityStandardAvailableActions(standard?.status)
    const request = standard?.approvalRequestSummary
    const isCurrentApprover = Boolean(
      currentUserId &&
      request &&
      (request.status === 'PENDING' || request.status === 'APPROVED_L1') &&
      (request.currentLevel === 2
        ? request.approver2Id
        : request.approver1Id) === currentUserId
    )
    return {
      ...actions,
      canApprove: actions.canApprove && isCurrentApprover,
      canReject: actions.canReject && isCurrentApprover,
    }
  }, [standard?.status, standard?.approvalRequestSummary, currentUserId])

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
      action:
        | QualityStandardWorkflowActionInput
        | QualityStandardReviewDecisionInput,
      successMessage: string
    ): Promise<Standard | null> => {
      if (!standard) {
        return null
      }

      try {
        if (action.type === 'approve' || action.type === 'reject') {
          const request = standard.approvalRequestSummary
          if (!request?.id) return null
          await submitReviewDecision({
            requestId: request.id,
            status: action.type === 'approve' ? 'APPROVED' : 'REJECTED',
            comment:
              action.type === 'approve'
                ? action.reviewComment
                : action.rejectReason,
          })
          await queryClient.invalidateQueries({
            queryKey: ['quality_standard'],
          })
          await queryClient.invalidateQueries({
            queryKey: ['quality_standards'],
          })
          const saved = await QualityCoreService.getStandardById(standard.id)
          toast.success(successMessage)
          return saved
        }
        const mutation = buildQualityStandardWorkflowMutation(standard, action)
        if (action.type === 'submitForApproval') {
          const result =
            await submitQualityStandardWithConfirmedApprovalRequest({
              savePendingStandard: () =>
                saveStandardMutation.mutateAsync({
                  data: mutation.data,
                  isPatch: true,
                  delta: mutation.delta,
                  suppressSuccessToast: true,
                }),
            })
          await queryClient.invalidateQueries({
            queryKey: ['quality_standard'],
          })
          await queryClient.invalidateQueries({
            queryKey: ['quality_standards'],
          })
          toast.success(successMessage)
          navigateToPreview(result.standard.id)
          return result.standard
        }
        const saved = await saveStandardMutation.mutateAsync({
          data: mutation.data,
          isPatch: true,
          delta: mutation.delta,
          successMessage,
        })

        navigateToPreview(saved.id)
        return saved
      } catch (error) {
        if (error instanceof QualityStandardApprovalResponseNotConfirmedError) {
          toast.error(t('quality.hooks.approvalResponseNotConfirmed'))
        } else if (action.type === 'approve' || action.type === 'reject') {
          handleServerError(error)
        }
        return null
      }
    },
    [
      navigateToPreview,
      queryClient,
      submitReviewDecision,
      saveStandardMutation,
      standard,
      t,
    ]
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
    isWorkflowActionPending:
      saveStandardMutation.isPending || isReviewDecisionPending,
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
