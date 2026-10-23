import { useId, type ReactNode } from 'react'
import { Save, Trash2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  type BOMPerformanceVersionOption,
  type SaveBOMPerformanceVersionOptionInput,
} from '../../services/bom-performance-version-option-service'
import {
  bomPerformanceVersionOptionInlineEditorStyles as editorStyles,
  bomPerformanceVersionOptionManagementDialogClasses as dialogClasses,
} from './bom-performance-version-option-management-dialog-and-inline-editor.styles'

interface BOMPerformanceVersionOptionInlineEditorProps {
  option?: BOMPerformanceVersionOption
  draft: SaveBOMPerformanceVersionOptionInput
  isSaving: boolean
  isDeleting: boolean
  isClosingAfterSuccessfulSave?: boolean
  onDraftChange: (draft: SaveBOMPerformanceVersionOptionInput) => void
  onSave: () => void
  onReset: () => void
  onDelete: () => void
  productWeightEditor?: ReactNode
  saveButtonLabel?: string
}

export function BOMPerformanceVersionOptionInlineEditor({
  option,
  draft,
  isSaving,
  isDeleting,
  isClosingAfterSuccessfulSave = false,
  onDraftChange,
  onSave,
  onReset,
  onDelete,
  productWeightEditor,
  saveButtonLabel,
}: BOMPerformanceVersionOptionInlineEditorProps) {
  const { locale } = useLanguage()
  const isZh = locale.startsWith('zh')
  const formId = useId()
  const isBusy = isSaving || isDeleting || isClosingAfterSuccessfulSave

  return (
    <section className='flex min-h-0 min-w-0 flex-1 flex-col'>
      <div className={editorStyles.editorHeading}>
        <h3 className={editorStyles.editorTitle}>
          {option
            ? isZh
              ? '编辑性能版本'
              : 'Edit performance version'
            : isZh
              ? '新增性能版本'
              : 'Add performance version'}
        </h3>
        <p className={editorStyles.editorDescription}>
          {isZh
            ? '填写版本信息并保存，即可在 BOM 中选择。'
            : 'Save the version details to make it available in BOMs.'}
        </p>
      </div>
      <form
        id={formId}
        className={editorStyles.form}
        onSubmit={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSave()
        }}
      >
        <fieldset disabled={isBusy} className={editorStyles.fieldset}>
          <div className='grid gap-3 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label
                htmlFor={`${formId}-name`}
                className={editorStyles.fieldLabel}
              >
                {isZh ? '性能版本名称' : 'Performance version name'}
                <span aria-hidden='true' className='text-destructive'>
                  *
                </span>
              </Label>
              <Input
                id={`${formId}-name`}
                required
                maxLength={255}
                className={editorStyles.input}
                value={draft.labelZh}
                placeholder={isZh ? '例如：轻量版' : 'For example: Lightweight'}
                onChange={(event) =>
                  onDraftChange({ ...draft, labelZh: event.target.value })
                }
              />
            </div>
            <div className='space-y-2'>
              <Label
                htmlFor={`${formId}-english-name`}
                className={editorStyles.fieldLabel}
              >
                {isZh ? '英文名称（选填）' : 'English name (optional)'}
              </Label>
              <Input
                id={`${formId}-english-name`}
                maxLength={255}
                className={editorStyles.input}
                value={draft.labelEn ?? ''}
                onChange={(event) =>
                  onDraftChange({ ...draft, labelEn: event.target.value })
                }
              />
            </div>
          </div>
          {productWeightEditor}
          <div className='space-y-2'>
            <Label
              htmlFor={`${formId}-description`}
              className={editorStyles.fieldLabel}
            >
              {isZh ? '说明（选填）' : 'Description (optional)'}
            </Label>
            <Textarea
              id={`${formId}-description`}
              className={editorStyles.textarea}
              value={draft.description ?? ''}
              onChange={(event) =>
                onDraftChange({ ...draft, description: event.target.value })
              }
            />
          </div>
          <div className={editorStyles.activeStatusRow}>
            <div className='space-y-1'>
              <Label
                htmlFor={`${formId}-active`}
                className={editorStyles.fieldLabel}
              >
                {isZh ? '启用状态' : 'Active status'}
              </Label>
              <p
                id={`${formId}-active-description`}
                className='text-xs text-muted-foreground'
              >
                {isZh
                  ? '启用后可在 BOM 中选择；停用后保留已有记录。'
                  : 'Active versions are available in BOMs. Disabling preserves existing records.'}
              </p>
            </div>
            <Switch
              id={`${formId}-active`}
              className={editorStyles.activeStatusSwitch}
              aria-describedby={`${formId}-active-description`}
              checked={draft.active ?? true}
              onCheckedChange={(active) => onDraftChange({ ...draft, active })}
            />
          </div>
        </fieldset>
      </form>
      <div className={dialogClasses.footer}>
        <div>
          {option && (
            <Button
              type='button'
              variant='ghost'
              disabled={isBusy}
              className={editorStyles.deleteButton}
              onClick={onDelete}
            >
              <Trash2 className='size-4' />
              {isDeleting
                ? isZh
                  ? '删除中…'
                  : 'Deleting…'
                : isZh
                  ? '删除'
                  : 'Delete'}
            </Button>
          )}
        </div>
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            className={editorStyles.resetButton}
            disabled={isBusy}
            onClick={onReset}
          >
            {isZh ? '重置' : 'Reset'}
          </Button>
          <Button
            type='submit'
            form={formId}
            className={editorStyles.saveButton}
            disabled={isBusy || !draft.labelZh.trim()}
          >
            <Save className='size-4' />
            {isClosingAfterSuccessfulSave
              ? isZh
                ? '已保存'
                : 'Saved'
              : isSaving
                ? isZh
                  ? '保存中…'
                  : 'Saving…'
                : (saveButtonLabel ?? (isZh ? '保存' : 'Save'))}
          </Button>
        </div>
      </div>
    </section>
  )
}
