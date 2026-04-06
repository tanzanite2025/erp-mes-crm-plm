'use client'

import { Layers } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
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

type BOMActionDialogProps = {
  currentRow?: BOM
  initialItems?: unknown[]
  initialProductId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: BOM) => void
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
  const { form, fields, append, remove, products, materials, dictEntries, changeOrders } = useBOMForm({
    currentRow,
    initialItems,
    initialProductId,
    open,
    isEdit,
  })

  const handleFormSubmit = (data: BOM) => {
    onSubmit?.(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[98vw] sm:max-w-[95vw] h-[98vh] max-h-[98vh] p-0 gap-0 rounded-[32px] border-none shadow-2xl overflow-hidden'>
        <DialogHeader className='p-4 sm:p-6 pb-2 text-start flex-none relative'>
          <DialogTitle className='flex items-center gap-2 sm:gap-3 text-base sm:text-xl font-black tracking-tighter uppercase italic pr-8'>
            <Layers className='size-5 sm:size-6 text-blue-600 stroke-[3] shrink-0' />
            <span className='truncate sm:whitespace-normal'>
              {isEdit
                ? t('engineering.bomArchive.dialog.editTitle')
                : t('engineering.bomArchive.dialog.createTitle')}
            </span>
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            id='bom-form'
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className='p-3 sm:p-4 pt-0 space-y-3 flex flex-col flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/10 scrollbar-track-transparent'
          >
            <BOMFormHeader
              form={form}
              products={products}
              changeOrders={changeOrders}
              dictEntries={dictEntries}
              isEdit={isEdit}
            />

            <BOMRecipeEditor
              form={form}
              fields={fields}
              materials={materials}
              append={append}
              remove={remove}
            />

            <div className='flex flex-col sm:flex-row items-stretch gap-2 sm:gap-4 pt-2 border-t border-dashed border-muted/50 h-auto sm:h-12 mb-1 shrink-0'>
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
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
