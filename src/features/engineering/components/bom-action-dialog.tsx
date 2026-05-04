'use client'

import { Layers } from 'lucide-react'
import { type UseFormReturn } from 'react-hook-form'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { BOMFormHeader } from './bom-editor/bom-form-header'
import { BOMRecipeEditor } from './bom-editor/bom-recipe-editor'
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
  const { t } = useLanguage()
  const isEdit = Boolean(currentRow)
  const { form, fields, append, remove, optionsResource, products, materials } = useBOMForm({
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex h-[94vh] max-h-[94vh] max-w-[98vw] flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl sm:max-w-[95vw]'>
        <DialogHeader className='p-4 sm:p-5 pb-1.5 text-start flex-none relative'>
          <div className='flex items-center justify-between gap-3'>
            <DialogTitle className='flex items-center gap-2 sm:gap-3 text-base sm:text-xl font-black tracking-tighter uppercase italic pr-8'>
              <Layers className='size-5 sm:size-6 text-blue-600 stroke-3 shrink-0' />
              <span className='truncate sm:whitespace-normal'>
                {isEdit
                  ? t('engineering.bomArchive.dialog.editTitle')
                  : t('engineering.bomArchive.dialog.createTitle')}
              </span>
            </DialogTitle>
            {isEdit && currentRow?.id ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.bom}
                targetId={currentRow.id}
                targetName={currentRow.bomNo}
                className='h-9 rounded-full border-dashed bg-background/80 px-4 text-[10px] font-black uppercase tracking-widest'
              />
            ) : null}
          </div>
        </DialogHeader>
        <Form {...typedForm}>
          <form
            id='bom-form'
            onSubmit={typedForm.handleSubmit(handleFormSubmit)}
            className='flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-0 sm:px-4 sm:pb-4 overflow-hidden'
          >
            {optionsResource.status === 'error' ? (
              <div className='flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-8 text-center'>
                <div className='flex max-w-md flex-col items-center gap-2'>
                  <Layers className='size-8 text-rose-500' />
                  <div className='text-[10px] font-black uppercase tracking-widest text-rose-700'>
                    {t('engineering.bomArchive.toasts.loadFailed')}
                  </div>
                  <p className='text-[11px] font-bold leading-relaxed text-foreground'>
                    {optionsResource.error.message}
                  </p>
                </div>
              </div>
            ) : optionsResource.status === 'loading' ? (
              <div className='flex min-h-0 flex-1 items-center justify-center rounded-[24px] border border-dashed border-muted/40 bg-muted/5 px-6 py-8 text-center'>
                <div className='flex max-w-md flex-col items-center gap-2'>
                  <Layers className='size-8 text-blue-400 animate-pulse' />
                  <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                    {t('engineering.bomArchive.header.title')}
                  </div>
                  <p className='text-[11px] font-bold leading-relaxed text-muted-foreground'>
                    {t('engineering.bomArchive.toasts.loadFailed')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <BOMFormHeader
                  form={typedForm}
                  products={products}
                  isEdit={isEdit}
                />

                <BOMRecipeEditor
                  form={typedForm}
                  fields={fields}
                  materials={materials}
                  append={append}
                  remove={remove}
                />

                <div className='flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 pt-1.5 border-t border-dashed border-muted/50 h-auto sm:h-11 shrink-0'>
                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem className='flex-1 space-y-0'>
                        <FormControl>
                          <Input
                            placeholder={t('engineering.bomArchive.dialog.remarkPlaceholder')}
                            {...field}
                            className='h-11 sm:h-full rounded-2xl border-none bg-muted/50 text-[11px] font-bold uppercase tracking-widest italic px-4 shadow-inner placeholder:text-[9px] placeholder:text-muted-foreground/40 placeholder:italic'
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type='submit'
                    form='bom-form'
                    className='h-12 sm:h-full w-full sm:w-64 rounded-xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest italic shadow-lg shadow-blue-600/10 shrink-0 hover:bg-blue-700 transition-all border border-white/20'
                  >
                    {t('engineering.bomArchive.dialog.save')}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
