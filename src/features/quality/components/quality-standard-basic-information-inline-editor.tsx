import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { Standard } from '../data/schema'
import { useQualityStandardEditorActions } from '../hooks/use-quality-standard-editor-actions'
import { useStandardEditorForm } from '../hooks/use-standard-editor-form'
import { getQualityStandardAvailableActions } from '../utils/quality-utils'
import { StandardEditorContent } from './standard-editor-content'

interface QualityStandardBasicInformationInlineEditorProps {
  standard: Standard
  onClose: () => void
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void
}

export function QualityStandardBasicInformationInlineEditor({
  standard,
  onClose,
  onUnsavedChangesChange,
}: QualityStandardBasicInformationInlineEditorProps) {
  const { t } = useLanguage()
  const [initialStandard] = useState(standard)
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] =
    useState(false)
  const editor = useStandardEditorForm({
    initialStandard,
    resetKey: `quality-standard-basic-information-${initialStandard.id}-${initialStandard.version}`,
    mode: 'edit',
    editInspectionCriteria: false,
  })
  const availableActions = getQualityStandardAvailableActions(standard.status)
  useEffect(() => {
    onUnsavedChangesChange?.(editor.isDirty)
  }, [editor.isDirty, onUnsavedChangesChange])
  useEffect(
    () => () => onUnsavedChangesChange?.(false),
    [onUnsavedChangesChange]
  )
  const actions = useQualityStandardEditorActions({
    mode: 'edit',
    standardId: standard.id,
    formData: editor.formData,
    isDirty: editor.isDirty,
    isReadOnly: availableActions.isReadOnly,
    buildSubmitPayload: editor.buildSubmitPayload,
    buildSubmitPayloadWithOverrides: editor.buildSubmitPayloadWithOverrides,
    onSaved: onClose,
  })

  function requestClosingBasicInformationEditor() {
    if (actions.isSavingStandard) return
    if (editor.isDirty) {
      setIsDiscardConfirmationOpen(true)
      return
    }
    onClose()
  }

  return (
    <section
      aria-label={t('quality.standards.workspace.editBasicInformation')}
      className='space-y-4 rounded-3xl border bg-background p-4 sm:p-5'
    >
      <StandardEditorContent
        mode='edit'
        formData={editor.formData}
        isDirty={editor.isDirty}
        readOnly={availableActions.isReadOnly || actions.isSavingStandard}
        inspectionCriteria={null}
        onInspectionCriteriaChange={editor.updateInspectionCriteria}
        onCodeChange={(value) => editor.updateField('code', value)}
        onNameChange={(value) => editor.updateField('name', value)}
        onRemarksChange={(value) => editor.updateField('remarks', value)}
        showInspectionRules={false}
      />
      <div className='flex flex-wrap justify-end gap-2 border-t pt-4'>
        <Button
          variant='outline'
          className='rounded-full'
          disabled={actions.isSavingStandard}
          onClick={requestClosingBasicInformationEditor}
        >
          {t('common.actions.cancel')}
        </Button>
        {!availableActions.isReadOnly ? (
          <Button
            className='rounded-full'
            disabled={actions.isSavingStandard}
            onClick={() => void actions.handleSave()}
          >
            {actions.isSavingStandard ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Save className='size-4' />
            )}
            {t('quality.standards.workspace.saveBasicInformation')}
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={isDiscardConfirmationOpen}
        onOpenChange={setIsDiscardConfirmationOpen}
        title={t('quality.standards.workspace.discardChangesTitle')}
        desc={t('quality.standards.workspace.discardChangesDescription')}
        cancelBtnText={t('quality.standards.workspace.keepEditing')}
        confirmText={t('quality.standards.workspace.discardAndClose')}
        handleConfirm={onClose}
      />
    </section>
  )
}
