import { useState } from 'react'
import { Layers3, Loader2, Save } from 'lucide-react'
import { isForbiddenError, isNotFoundError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ForbiddenState } from '@/components/forbidden-state'
import { QualityStandardInspectionRulesValidationError } from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'
import { useGetQualityStandard } from '../hooks/use-quality'
import { useQualityStandardEditorActions } from '../hooks/use-quality-standard-editor-actions'
import {
  useStandardEditorForm,
  type StandardEditorSubmitPayload,
} from '../hooks/use-standard-editor-form'
import { getQualityStandardAvailableActions } from '../utils/quality-utils'
import { QualityInspectionStageManagementDialog } from './quality-inspection-stage-management-dialog'
import { QualityStandardInspectionRulesEditor } from './quality-standard-inspection-rules-editor'

interface QualityStandardEditorDialogProps {
  standardId: string
  onClose: () => void
}

export function QualityStandardEditorDialog({
  standardId,
  onClose,
}: QualityStandardEditorDialogProps) {
  const { t } = useLanguage()
  const standardQuery = useGetQualityStandard(standardId)

  if (
    standardQuery.error instanceof QualityStandardInspectionRulesValidationError
  ) {
    return (
      <QualityStandardEditorDialogForm
        key={standardId}
        standard={{ ...standardQuery.error.standardSummary, items: [] }}
        inspectionRulesToReplace={{
          originalItems: standardQuery.error.originalInspectionItems,
        }}
        onClose={onClose}
      />
    )
  }

  if (standardQuery.data) {
    return (
      <QualityStandardEditorDialogForm
        key={standardId}
        standard={standardQuery.data}
        onClose={onClose}
      />
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size='full'
        className='flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col'
      >
        <DialogHeader>
          <DialogTitle>
            {t('quality.standards.workspace.inspectionRulesEditorTitle')}
          </DialogTitle>
          <DialogDescription className='text-[13px] leading-5'>
            {t('quality.standards.workspace.inspectionRulesEditorDescription')}
          </DialogDescription>
        </DialogHeader>
        {standardQuery.isLoading ? (
          <div
            role='status'
            className='flex min-h-64 items-center justify-center gap-2 text-[13px] leading-5 text-muted-foreground'
          >
            <Loader2 className='size-5 animate-spin' />
            {t('common.actions.loading')}
          </div>
        ) : isForbiddenError(standardQuery.error) ? (
          <ForbiddenState />
        ) : (
          <div role='alert' className='space-y-4 py-6'>
            <p className='text-[13px] leading-5'>
              {t(
                isNotFoundError(standardQuery.error)
                  ? 'quality.standards.workspace.editorMissingTitle'
                  : 'quality.standards.workspace.editorLoadFailedTitle'
              )}
            </p>
            <Button
              variant='outline'
              className='rounded-full'
              onClick={() => void standardQuery.refetch()}
            >
              {t('quality.standards.inspectionStages.retry')}
            </Button>
          </div>
        )}
        <DialogFooter>
          <Button variant='outline' className='rounded-full' onClick={onClose}>
            {t('common.actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function QualityStandardEditorDialogForm({
  standard,
  onClose,
  inspectionRulesToReplace,
}: {
  standard: Standard
  onClose: () => void
  inspectionRulesToReplace?: { originalItems: unknown }
}) {
  const { t } = useLanguage()
  // Keep this editing session intact when background queries refresh.
  const [initialStandard] = useState(standard)
  const [initialInspectionRulesToReplace] = useState(inspectionRulesToReplace)
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] =
    useState(false)
  const [isStageManagementOpen, setIsStageManagementOpen] = useState(false)
  const editor = useStandardEditorForm({
    initialStandard,
    resetKey: `quality-standard-dialog-${initialStandard.id}-${initialStandard.version}`,
    mode: 'edit',
  })
  const availableActions = getQualityStandardAvailableActions(standard.status)

  function preserveOriginalInspectionItemsInReplacementPayload(
    payload: StandardEditorSubmitPayload | null
  ) {
    if (payload?.delta?.items && initialInspectionRulesToReplace) {
      payload.delta.items.o = initialInspectionRulesToReplace.originalItems
    }
    return payload
  }

  const actions = useQualityStandardEditorActions({
    mode: 'edit',
    standardId: standard.id,
    formData: editor.formData,
    isDirty: editor.isDirty,
    isReadOnly: availableActions.isReadOnly,
    buildSubmitPayload: () =>
      preserveOriginalInspectionItemsInReplacementPayload(
        editor.buildSubmitPayload()
      ),
    buildSubmitPayloadWithOverrides: (overrides) =>
      preserveOriginalInspectionItemsInReplacementPayload(
        editor.buildSubmitPayloadWithOverrides(overrides)
      ),
    onSaved: onClose,
  })
  const isSaving = actions.isSavingStandard

  function requestClosingQualityStandardEditor() {
    if (isSaving) return
    if (editor.isDirty) {
      setIsDiscardConfirmationOpen(true)
      return
    }
    onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && requestClosingQualityStandardEditor()}
    >
      <DialogContent
        size='full'
        data-mobile-floating-surface-layout='column'
        className='flex h-[calc(100dvh-2rem)] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[1600px] flex-col gap-0 overflow-hidden rounded-3xl p-0'
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className='shrink-0 border-b p-5'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='min-w-0 space-y-2'>
              <DialogTitle>
                {t('quality.standards.workspace.inspectionRulesEditorTitle')}
              </DialogTitle>
              <DialogDescription className='truncate text-[13px] leading-5'>
                {standard.name}
              </DialogDescription>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              {editor.isDirty ? (
                <Badge variant='outline'>
                  {t('quality.standards.workspace.editorDirty')}
                </Badge>
              ) : null}
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full'
                disabled={isSaving}
                onClick={() => setIsStageManagementOpen(true)}
              >
                <Layers3 className='size-4' />
                {t('quality.standards.inspectionStages.manage')}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 flex-1 overflow-y-auto p-4 sm:p-5'
        >
          {initialInspectionRulesToReplace ? (
            <p
              role='status'
              className='mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-[13px] leading-5'
            >
              {t(
                availableActions.isReadOnly
                  ? 'quality.standards.workspace.inspectionRulesReconfigurationReadOnly'
                  : 'quality.standards.workspace.inspectionRulesReplacementNotice'
              )}
            </p>
          ) : null}
          {availableActions.isReadOnly ? (
            <p className='mb-4 text-xs leading-5 text-muted-foreground'>
              {t('quality.standards.workspace.readOnlyHint')}
            </p>
          ) : null}
          <QualityStandardInspectionRulesEditor
            readOnly={availableActions.isReadOnly || isSaving}
            inspectionCriteria={editor.inspectionCriteria}
            onInspectionCriteriaChange={editor.updateInspectionCriteria}
          />
        </div>
        <DialogFooter className='shrink-0 border-t p-4 sm:p-5'>
          <Button
            variant='outline'
            className='rounded-full'
            disabled={isSaving}
            onClick={requestClosingQualityStandardEditor}
          >
            {t('common.actions.close')}
          </Button>
          {!availableActions.isReadOnly ? (
            <Button
              className='rounded-full'
              disabled={
                isSaving ||
                Boolean(
                  initialInspectionRulesToReplace &&
                  (!editor.isDirty || !editor.inspectionCriteria?.length)
                )
              }
              onClick={() => void actions.handleSave()}
            >
              {isSaving ? (
                <Loader2 className='size-4 animate-spin' />
              ) : (
                <Save className='size-4' />
              )}
              {t('quality.standards.dialog.action.save')}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
      {isStageManagementOpen ? (
        <QualityInspectionStageManagementDialog
          open
          onOpenChange={setIsStageManagementOpen}
        />
      ) : null}
      <ConfirmDialog
        className='z-102'
        overlayClassName='z-102'
        open={isDiscardConfirmationOpen}
        onOpenChange={setIsDiscardConfirmationOpen}
        title={t('quality.standards.workspace.discardChangesTitle')}
        desc={t('quality.standards.workspace.discardChangesDescription')}
        cancelBtnText={t('quality.standards.workspace.keepEditing')}
        confirmText={t('quality.standards.workspace.discardAndClose')}
        handleConfirm={onClose}
      />
    </Dialog>
  )
}
