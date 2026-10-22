'use client'

import { useId, type ReactNode } from 'react'
import { type TranslationKey } from '@/locales'
import { LayoutTemplate, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { buildActionDialogShellClasses } from '@/components/action-dialog-shell.styles'
import { type ProductTemplate } from '../../data/schema'
import { ProductTemplateOwnedAttributeDefinitionsEditor } from './product-template-owned-attribute-definitions-editor'

const productTemplateEditorDialogClasses = buildActionDialogShellClasses({
  content:
    'flex h-[min(52rem,90dvh)] flex-col gap-0 rounded-[24px] sm:rounded-[32px] [&_[data-slot=button]]:rounded-full',
  header: 'border-muted/50 px-5 py-5 pr-16 text-start sm:px-8 sm:py-6 sm:pr-16',
  title: 'flex items-center gap-3 text-base text-primary sm:text-lg',
  description:
    'text-xs leading-relaxed font-normal tracking-normal normal-case',
  body: 'min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-8',
  footer:
    'shrink-0 flex-row justify-end gap-3 border-muted/50 px-5 py-4 sm:px-8 sm:py-5',
})

interface TemplateEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingTemplate: ProductTemplate | null
  onTemplateChange: (
    updater: (previous: ProductTemplate | null) => ProductTemplate | null
  ) => void
  onSubmit: () => void
  isSaving: boolean
  locale: string
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
  wizardHeader?: ReactNode
}

export function TemplateEditorDialog({
  open,
  onOpenChange,
  editingTemplate,
  onTemplateChange,
  onSubmit,
  isSaving,
  locale,
  t,
  wizardHeader,
}: TemplateEditorDialogProps) {
  const formId = useId()
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size='4xl'
        className={productTemplateEditorDialogClasses.content}
        closeButtonClassName='top-5 end-5 flex size-8 items-center justify-center rounded-full'
      >
        <DialogHeader className={productTemplateEditorDialogClasses.header}>
          {wizardHeader}
          <DialogTitle className={productTemplateEditorDialogClasses.title}>
            <LayoutTemplate className='size-5' />
            {editingTemplate?.id
              ? t('engineering.templateMgmt.dialog.editTitle')
              : t('engineering.templateMgmt.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription
            className={productTemplateEditorDialogClasses.description}
          >
            {locale.startsWith('zh')
              ? '配置当前模板的基本信息、属性和可选内容。各模板独立维护，修改仅作用于当前模板。'
              : 'Configure this template’s information, attributes and options. Changes apply only to this template.'}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          className={productTemplateEditorDialogClasses.body}
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving) onSubmit()
          }}
        >
          <fieldset disabled={isSaving} className='min-w-0 space-y-6'>
            <div className='grid min-w-0 items-start gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor={formId + '-name'}>
                  {t('engineering.templateMgmt.fields.name')}
                </Label>
                <Input
                  id={formId + '-name'}
                  autoFocus
                  required
                  maxLength={255}
                  value={editingTemplate?.name ?? ''}
                  onChange={(event) =>
                    onTemplateChange((previous) =>
                      previous
                        ? { ...previous, name: event.target.value }
                        : previous
                    )
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor={formId + '-description'}>
                  {t('engineering.templateMgmt.fields.description')}
                </Label>
                <Textarea
                  id={formId + '-description'}
                  className='min-h-20'
                  value={editingTemplate?.description ?? ''}
                  onChange={(event) =>
                    onTemplateChange((previous) =>
                      previous
                        ? { ...previous, description: event.target.value }
                        : previous
                    )
                  }
                />
              </div>
            </div>
            <ProductTemplateOwnedAttributeDefinitionsEditor
              locale={locale}
              definitions={editingTemplate?.attributeBindings ?? []}
              onDefinitionsChange={(definitions) =>
                onTemplateChange((previous) =>
                  previous
                    ? { ...previous, attributeBindings: definitions }
                    : previous
                )
              }
            />
          </fieldset>
        </form>
        <DialogFooter className={productTemplateEditorDialogClasses.footer}>
          <Button
            type='button'
            variant='outline'
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            {t('engineering.templateMgmt.buttons.cancel')}
          </Button>
          <Button type='submit' form={formId} disabled={isSaving}>
            <Save className='size-4' />
            {isSaving
              ? t('engineering.templateMgmt.buttons.saving')
              : t('engineering.templateMgmt.buttons.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
