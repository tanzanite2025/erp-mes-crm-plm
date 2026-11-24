import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import type { Standard } from '../data/schema'
import {
  QualityStandardApprovalResponseNotConfirmedError,
  submitQualityStandardWithConfirmedApprovalRequest,
} from '../services/quality-standard-approval-submission-service'
import { buildQualityStandardWorkflowChangeSet } from '../services/quality-standard-workflow-service'
import { normalizeQualityStandardStatus } from '../utils/quality-utils'
import { useQualityMutations } from './use-quality'
import type { StandardEditorSubmitPayload } from './use-standard-editor-form'

interface UseQualityStandardEditorActionsOptions {
  mode: 'create' | 'edit'
  standardId?: string
  formData: Standard
  isDirty: boolean
  isReadOnly: boolean
  buildSubmitPayload: () => StandardEditorSubmitPayload | null
  buildSubmitPayloadWithOverrides: (
    overrides?: Partial<Standard>
  ) => StandardEditorSubmitPayload | null
  onSaved?: (standard: Standard) => void
}

export function useQualityStandardEditorActions({
  mode,
  standardId,
  formData,
  isDirty,
  isReadOnly,
  buildSubmitPayload,
  buildSubmitPayloadWithOverrides,
  onSaved,
}: UseQualityStandardEditorActionsOptions) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const { saveStandardMutation } = useQualityMutations()
  const [isApprovalSubmissionPending, setIsApprovalSubmissionPending] =
    useState(false)
  const isEdit = mode === 'edit'

  const finishSavingQualityStandard = useCallback(
    (saved: Standard) => {
      if (onSaved) {
        onSaved(saved)
        return
      }
      navigate({
        to: '/quality/standards/$standardId/preview',
        params: { standardId: saved.id },
      })
    },
    [navigate, onSaved]
  )

  const handleBack = useCallback(() => {
    navigate({ to: '/quality/standards' })
  }, [navigate])

  const handleOpenPreview = useCallback(() => {
    if (!standardId) return
    navigate({
      to: '/quality/standards/$standardId/preview',
      params: { standardId },
    })
  }, [navigate, standardId])

  const handleSave = useCallback(async () => {
    if (isApprovalSubmissionPending || saveStandardMutation.isPending) return
    if (isReadOnly) {
      handleOpenPreview()
      return
    }

    const payload = buildSubmitPayload()

    if (!payload) {
      if (isEdit && !isDirty) {
        finishSavingQualityStandard(formData)
      }
      return
    }

    try {
      const saved = await saveStandardMutation.mutateAsync(payload)
      finishSavingQualityStandard(saved)
    } catch {
      return
    }
  }, [
    buildSubmitPayload,
    finishSavingQualityStandard,
    formData,
    handleOpenPreview,
    isDirty,
    isEdit,
    isReadOnly,
    isApprovalSubmissionPending,
    saveStandardMutation,
  ])

  const handleSubmitForApproval = useCallback(async () => {
    if (
      isReadOnly ||
      isApprovalSubmissionPending ||
      saveStandardMutation.isPending
    )
      return
    const workflowChangeSet = buildQualityStandardWorkflowChangeSet({
      type: 'submitForApproval',
    })

    const payload = buildSubmitPayloadWithOverrides(
      workflowChangeSet.nextFields
    )

    if (!payload) {
      if (
        isEdit &&
        normalizeQualityStandardStatus(formData.status) ===
          'PENDING_APPROVAL' &&
        !isDirty
      ) {
        handleOpenPreview()
      }
      return
    }

    try {
      setIsApprovalSubmissionPending(true)
      const result = await submitQualityStandardWithConfirmedApprovalRequest({
        savePendingStandard: () =>
          saveStandardMutation.mutateAsync({
            ...payload,
            suppressSuccessToast: true,
          }),
      })
      await queryClient.invalidateQueries({ queryKey: ['quality_standard'] })
      await queryClient.invalidateQueries({ queryKey: ['quality_standards'] })
      toast.success(t('quality.hooks.submitForApprovalSuccess'))
      finishSavingQualityStandard(result.standard)
    } catch (error) {
      if (error instanceof QualityStandardApprovalResponseNotConfirmedError) {
        toast.error(t('quality.hooks.approvalResponseNotConfirmed'))
      }
      return
    } finally {
      setIsApprovalSubmissionPending(false)
    }
  }, [
    buildSubmitPayloadWithOverrides,
    finishSavingQualityStandard,
    formData.status,
    handleOpenPreview,
    isDirty,
    isEdit,
    isReadOnly,
    isApprovalSubmissionPending,
    queryClient,
    saveStandardMutation,
    t,
  ])

  return {
    saveStandardMutation,
    isSavingStandard:
      saveStandardMutation.isPending || isApprovalSubmissionPending,
    handleBack,
    handleOpenPreview,
    handleSave,
    handleSubmitForApproval,
  }
}
