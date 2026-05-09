'use client'

import { type UseFormReturn } from 'react-hook-form'
import { Form } from '@/components/ui/form'
import { BOMFormHeader } from './bom-editor/bom-form-header'
import { BOMWorkspace } from './bom-editor/bom-workspace'
import { BOMDialogFooter } from './bom-dialog-footer'
import { BOMDialogResourceBoundary } from './bom-dialog-resource-boundary'
import { BOMDialogShell } from './bom-dialog-shell'
import { type BOM } from '../data/schema'
import { useBOMForm } from '../hooks/use-bom-form'
import { type BOMItemDraft } from '../mutation-types'

type BOMActionDialogProps = {
  currentRow?: BOM
  initialItems?: BOMItemDraft[]
  initialProductId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: BOM) => void | Promise<void>
}

export function BOMActionDialog({
  currentRow,
  initialItems,
  initialProductId,
  open,
  onOpenChange,
  onSubmit,
}: BOMActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const { form, fields, append, remove, optionsResource, products, materials, sections } = useBOMForm({
    currentRow,
    initialItems,
    initialProductId,
    open,
    isEdit,
  })
  const typedForm = form as UseFormReturn<BOM>

  const handleFormSubmit = async (data: BOM) => {
    if (isEdit && !typedForm.formState.isDirty) {
      onOpenChange(false)
      return
    }

    if (onSubmit) {
      await onSubmit(data)
      return
    }

    onOpenChange(false)
  }

  return (
    <BOMDialogShell
      open={open}
      onOpenChange={onOpenChange}
      isEdit={isEdit}
      auditTarget={isEdit && currentRow?.id ? { id: currentRow.id, name: currentRow.bomNo } : undefined}
    >
      <Form {...typedForm}>
        <form
          id='bom-form'
          onSubmit={typedForm.handleSubmit(handleFormSubmit)}
          className='flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-3 pb-3 pt-0 sm:px-4 sm:pb-4'
        >
          <BOMDialogResourceBoundary resource={optionsResource}>
            <BOMFormHeader
              form={typedForm}
              products={products}
              isEdit={isEdit}
            />

            <BOMWorkspace
              form={typedForm}
              fields={fields}
              materials={materials}
              sections={sections}
              append={append}
              remove={remove}
            />

            <BOMDialogFooter form={typedForm} isSubmitDisabled={false} />
          </BOMDialogResourceBoundary>
        </form>
      </Form>
    </BOMDialogShell>
  )
}
