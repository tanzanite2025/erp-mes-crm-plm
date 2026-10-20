import { useCallback } from 'react'
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
}

export function useQualityStandardEditorActions({
  mode,
  standardId,
  formData,
  isDirty,
  isReadOnly,
  buildSubmitPayload,
  buildSubmitPayloadWithOverrides,
}: UseQualityStandardEditorActionsOptions) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useLanguage()
  const { saveStandardMutation } = useQualityMutations()
  const isEdit = mode === 'edit'

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
    if (isReadOnly) {
      handleOpenPreview()
      return
    }

    const payload = buildSubmitPayload()

    if (!payload) {
      if (isEdit && !isDirty) {
        handleOpenPreview()
      }
      return
    }

    try {
      const saved = await saveStandardMutation.mutateAsync(payload)
      navigate({
        to: '/quality/standards/$standardId/preview',
        params: { standardId: saved.id },
      })
    } catch {
      return
    }
  }, [
    buildSubmitPayload,
    handleOpenPreview,
    isDirty,
    isEdit,
    isReadOnly,
    navigate,
    saveStandardMutation,
  ])

  const handleSubmitForApproval = useCallback(async () => {
    if (isReadOnly) return
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
      navigate({
        to: '/quality/standards/$standardId/preview',
        params: { standardId: result.standard.id },
      })
    } catch (error) {
      if (error instanceof QualityStandardApprovalResponseNotConfirmedError) {
        toast.error(t('quality.hooks.approvalResponseNotConfirmed'))
      }
      return
    }
  }, [
    buildSubmitPayloadWithOverrides,
    formData.status,
    handleOpenPreview,
    isDirty,
    isEdit,
    isReadOnly,
    navigate,
    queryClient,
    saveStandardMutation,
    t,
  ])

  return {
    saveStandardMutation,
    handleBack,
    handleOpenPreview,
    handleSave,
    handleSubmitForApproval,
  }
}
