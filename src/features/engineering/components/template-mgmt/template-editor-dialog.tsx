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
import { type ProductTemplate } from '../../data/schema'
import { productPhysicalSpecificationTemplateEditorDialogClasses as dialogClasses } from './product-physical-specification-template-editor-dialog-and-attribute-layout.styles'
import { ProductTemplateOwnedAttributeDefinitionsEditor } from './product-template-owned-attribute-definitions-editor'

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
  const templateName = editingTemplate?.name.trim()
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSaving) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size='full'
        className={dialogClasses.content}
        closeButtonClassName='top-4 end-4 flex size-8 items-center justify-center rounded-full hover:bg-muted/40'
      >
        <DialogHeader className={dialogClasses.header}>
          {wizardHeader}
          <DialogTitle className={dialogClasses.title}>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400'>
              <LayoutTemplate className='size-4.5' />
            </span>
            <span className='min-w-0 break-words'>
              {editingTemplate?.id
                ? templateName
                  ? t('engineering.templateMgmt.dialog.editNamedTitle', {
                      name: templateName,
                    })
                  : t('engineering.templateMgmt.dialog.editTitle')
                : t('engineering.templateMgmt.dialog.createTitle')}
            </span>
          </DialogTitle>
          <DialogDescription className={dialogClasses.description}>
            {t('engineering.templateMgmt.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          className={dialogClasses.body}
          onSubmit={(event) => {
            event.preventDefault()
            if (!isSaving) onSubmit()
          }}
        >
          <fieldset disabled={isSaving} className='min-w-0 space-y-5'>
            <div className='grid min-w-0 items-start gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'>
              <div className='space-y-1.5'>
                <Label htmlFor={formId + '-name'}>
                  {t('engineering.templateMgmt.fields.name')}
                </Label>
                <Input
                  id={formId + '-name'}
                  autoFocus
                  required
                  maxLength={255}
                  className='h-9 rounded-xl border-transparent bg-muted/40 text-sm font-semibold shadow-none focus-visible:border-blue-400 focus-visible:ring-blue-500/20'
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
              <div className='space-y-1.5'>
                <Label htmlFor={formId + '-description'}>
                  {t('engineering.templateMgmt.fields.description')}
                </Label>
                <Textarea
                  id={formId + '-description'}
                  rows={1}
                  className='h-9 min-h-9 resize-y rounded-xl border-transparent bg-muted/40 py-2 text-xs shadow-none focus-visible:border-blue-400 focus-visible:ring-blue-500/20'
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
        <DialogFooter className={dialogClasses.footer}>
          <Button
            type='button'
            variant='outline'
            disabled={isSaving}
            className='h-11 rounded-full border-dashed bg-transparent px-6 text-[11px] font-black shadow-none'
            onClick={() => onOpenChange(false)}
          >
            {t('engineering.templateMgmt.buttons.cancel')}
          </Button>
          <Button
            type='submit'
            form={formId}
            disabled={isSaving}
            className='h-11 rounded-full bg-blue-600 px-8 text-[11px] font-black text-white shadow-xl shadow-blue-500/20 hover:bg-blue-700'
          >
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
