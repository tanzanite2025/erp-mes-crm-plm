'use client'

import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { type ProductType } from '../data/schema'
import { useProductTypeDialogForm } from '../hooks/use-product-type-dialog-form'
import { type SaveProductTypeInput } from '../mutation-types'
import { productCreationGuideDialogContentClassName } from './product-creation-dialog-layout.styles'
import { ProductTypeCategoryDetailsFields } from './product-types/product-type-category-details-fields'
import { ProductTypeTemplateBindingFields } from './product-types/product-type-template-binding-fields'

type ProductTypeActionDialogProps = {
  currentRow?: ProductType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: SaveProductTypeInput) => void | Promise<void>
  initialTemplateId?: string
  wizardHeader?: React.ReactNode
}

export function ProductTypeActionDialog({
  currentRow,
  open,
  onOpenChange,
  onSubmit,
  initialTemplateId,
  wizardHeader,
}: ProductTypeActionDialogProps) {
  const { t } = useLanguage()
  const categoryForm = useProductTypeDialogForm({
    currentRow,
    open,
    onSubmit,
    initialTemplateId,
  })
  const {
    form,
    isEdit,
    isSubmitting,
    submissionError,
    handleFormSubmit,
    handleFormValidationFailure,
  } = categoryForm

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          wizardHeader
            ? productCreationGuideDialogContentClassName
            : 'flex w-[96vw] flex-col gap-0 rounded-[24px] border-none p-0 shadow-2xl sm:max-w-4xl sm:rounded-[32px]',
          'overflow-clip'
        )}
      >
        {wizardHeader}
        <DialogHeader className='shrink-0 border-b px-4 py-4 pr-12 text-start sm:px-6 sm:pr-12'>
          <DialogTitle className='text-base font-semibold sm:text-lg'>
            {isEdit
              ? t('engineering.categoryArchive.dialog.editTitle')
              : t('engineering.categoryArchive.dialog.createTitle')}
          </DialogTitle>
          <DialogDescription className='text-sm leading-relaxed'>
            {isEdit
              ? t('engineering.categoryArchive.dialog.editDescription')
              : t('engineering.categoryArchive.dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            id='product-type-form'
            onSubmit={form.handleSubmit(
              handleFormSubmit,
              handleFormValidationFailure
            )}
            className='custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-5'
          >
            <input type='hidden' {...form.register('id')} />
            <input type='hidden' {...form.register('createdAt')} />
            <input type='hidden' {...form.register('version')} />

            <div className='grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'>
              <ProductTypeCategoryDetailsFields
                form={form}
                parentItems={categoryForm.parentItems}
                targetLevelLabel={categoryForm.targetLevelLabel}
                selectedParentMeta={categoryForm.selectedParentMeta}
                parentPathLabel={categoryForm.parentPathLabel}
                hierarchyHint={categoryForm.hierarchyHint}
                isCatalogLoading={categoryForm.isCatalogLoading}
                hasCatalogLoadError={categoryForm.hasCatalogLoadError}
                reloadProductCategoryDialogCatalog={
                  categoryForm.reloadProductCategoryDialogCatalog
                }
                markCategoryCodeAsManuallyEdited={
                  categoryForm.markCategoryCodeAsManuallyEdited
                }
              />
              <ProductTypeTemplateBindingFields
                form={form}
                localizedTemplates={categoryForm.localizedTemplates}
                selectedTemplate={categoryForm.selectedTemplate}
                templateAssembly={categoryForm.templateAssembly}
              />
            </div>
          </form>
        </Form>
        <DialogFooter className='shrink-0 flex-col gap-3 border-t bg-background p-4 sm:flex-col sm:px-6'>
          {submissionError && (
            <p
              role='alert'
              className='rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm leading-relaxed break-words text-destructive'
            >
              {submissionError}
            </p>
          )}
          <Button
            type='submit'
            form='product-type-form'
            disabled={isSubmitting}
            className='h-10 w-full rounded-full px-8 sm:w-auto sm:self-end'
          >
            {isSubmitting
              ? t('engineering.categoryArchive.dialog.saving')
              : t('engineering.categoryArchive.dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
