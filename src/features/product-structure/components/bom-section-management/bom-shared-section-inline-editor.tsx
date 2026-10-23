import { useId } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { type BOMSharedSectionManagementEditor } from '../../hooks/use-bom-shared-section-management-editor'

export function BOMSharedSectionInlineEditor({
  editor,
}: {
  editor: BOMSharedSectionManagementEditor
}) {
  const { t } = useLanguage()
  const fieldId = useId()
  const {
    draft,
    selectedSection,
    canManage,
    isActionLoading,
    isLastActiveSection,
    updateBOMSharedSectionEditorDraft: updateDraft,
  } = editor
  const disabled = !canManage || isActionLoading
  const inputClassName =
    'h-10 w-full rounded-xl border-transparent bg-muted/40 text-sm shadow-none'
  return (
    <div className='space-y-4'>
      <h3 className='text-sm font-bold'>
        {t(
          selectedSection
            ? 'engineering.bomSectionConfig.dialog.editTitle'
            : 'engineering.bomSectionConfig.dialog.createTitle'
        )}
      </h3>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label htmlFor={`${fieldId}-code`}>
            {t('engineering.bomSectionConfig.fields.code')}
          </Label>
          <Input
            id={`${fieldId}-code`}
            value={draft.code}
            disabled={disabled || Boolean(selectedSection)}
            onChange={(event) => updateDraft({ code: event.target.value })}
            placeholder={t('engineering.bomSectionConfig.placeholders.code')}
            className={inputClassName}
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor={`${fieldId}-name`}>
            {t('engineering.bomSectionConfig.fields.name')}
          </Label>
          <Input
            id={`${fieldId}-name`}
            value={draft.name}
            disabled={disabled}
            onChange={(event) => updateDraft({ name: event.target.value })}
            placeholder={t('engineering.bomSectionConfig.placeholders.name')}
            className={inputClassName}
          />
        </div>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor={`${fieldId}-description`}>
          {t('engineering.bomSectionConfig.fields.description')}
        </Label>
        <Textarea
          id={`${fieldId}-description`}
          value={draft.description}
          disabled={disabled}
          onChange={(event) => updateDraft({ description: event.target.value })}
          placeholder={t(
            'engineering.bomSectionConfig.placeholders.description'
          )}
          className='min-h-16 resize-y rounded-xl border-transparent bg-muted/40 text-sm shadow-none'
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor={`${fieldId}-sort-order`}>
          {t('engineering.bomSectionConfig.fields.sortOrder')}
        </Label>
        <Input
          id={`${fieldId}-sort-order`}
          type='number'
          step={1}
          value={draft.sortOrder}
          disabled={disabled}
          onChange={(event) => {
            const value = Number(event.target.value)
            if (Number.isFinite(value))
              updateDraft({ sortOrder: Math.trunc(value) })
          }}
          className={inputClassName}
        />
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='flex items-start justify-between gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-3'>
          <div className='space-y-1'>
            <Label htmlFor={`${fieldId}-active`}>
              {t('engineering.bomSectionConfig.fields.active')}
            </Label>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t(
                isLastActiveSection
                  ? 'engineering.bomSectionConfig.fields.activeLockedHint'
                  : 'engineering.bomSectionConfig.fields.activeHint'
              )}
            </p>
          </div>
          <Switch
            id={`${fieldId}-active`}
            checked={draft.active}
            disabled={disabled || (isLastActiveSection && draft.active)}
            onCheckedChange={(active) => updateDraft({ active })}
          />
        </div>
        <div className='flex items-start justify-between gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-3'>
          <div className='space-y-1'>
            <Label htmlFor={`${fieldId}-default`}>
              {t('engineering.bomSectionConfig.fields.isDefault')}
            </Label>
            <p className='text-xs leading-relaxed text-muted-foreground'>
              {t('engineering.bomSectionConfig.fields.isDefaultHint')}
            </p>
          </div>
          <Switch
            id={`${fieldId}-default`}
            checked={draft.isDefault}
            disabled={disabled}
            onCheckedChange={(isDefault) => updateDraft({ isDefault })}
          />
        </div>
      </div>
    </div>
  )
}
