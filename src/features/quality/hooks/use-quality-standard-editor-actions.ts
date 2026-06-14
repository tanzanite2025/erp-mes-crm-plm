import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import type { Standard } from '../data/schema'
import { dispatchQualityStandardRoutingEvent } from '../services/quality-routing-service'
import { buildQualityStandardWorkflowChangeSet } from '../services/quality-standard-workflow-service'
import { normalizeQualityStandardStatus } from '../utils/quality-utils'
import { useQualityMutations } from './use-quality'
import type { StandardEditorSubmitPayload } from './use-standard-editor-form'

interface UseQualityStandardEditorActionsOptions {
  mode: 'create' | 'edit'
  standardId?: string
  standard?: Standard
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
  standard,
  formData,
  isDirty,
  isReadOnly,
  buildSubmitPayload,
  buildSubmitPayloadWithOverrides,
}: UseQualityStandardEditorActionsOptions) {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { saveStandardMutation } = useQualityMutations()
  const isEdit = mode === 'edit'
  const previousStatus = standard?.status ?? formData.status

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
      if (!isEdit) {
        await dispatchQualityStandardRoutingEvent({
          standard: saved,
          semanticAction: 'CREATED',
        })
      }
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
      const saved = await saveStandardMutation.mutateAsync({
        ...payload,
        successMessage: t('quality.hooks.submitForApprovalSuccess'),
      })
      await dispatchQualityStandardRoutingEvent({
        standard: saved,
        semanticAction: workflowChangeSet.semanticAction,
        previousStatus,
      })
      navigate({
        to: '/quality/standards/$standardId/preview',
        params: { standardId: saved.id },
      })
    } catch {
      return
    }
  }, [
    buildSubmitPayloadWithOverrides,
    formData.status,
    handleOpenPreview,
    isDirty,
    isEdit,
    navigate,
    previousStatus,
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
