'use client'

import React from 'react'
import { Box } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form } from '@/components/ui/form'
import { useLanguage } from '@/context/language-provider'
import { createLogger } from '@/lib/logger'
import { getLocalizedSpecComponents } from './specs'
import { ProductBasicInfo } from './product/product-basic-info'
import { ProductionRestrictions } from './product/production-restrictions'
import { useProductForm } from '../hooks/use-product-form'
import { type Product, type ProductType } from '../data/schema'

const logger = createLogger('ProductActionDialog')

interface ProductActionDialogProps {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: Product | Product[]) => void
  productTypes?: ProductType[]
}

export function ProductActionDialog(props: ProductActionDialogProps) {
  const { t } = useLanguage()
  const specComponents = getLocalizedSpecComponents(t)
  const {
    currentRow,
    open,
    onOpenChange,
    onSubmit,
    productTypes = [],
  } = props

  const {
    form,
    isEdit,
    dynamicTypes,
    tireTypeOptions,
    brakeTypeOptions,
    techSeriesOptions,
    versionLevelOptions,
    moldOptions,
    specOptions,
    selectedVariants,
    watchedTemplateKey,
    specSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  } = useProductForm({ currentRow, open, productTypes, onOpenChange, onSubmit })

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 1024 * 1024) {
      toast.error(t('engineering.productArchive.toasts.imageTooLarge'))
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      form.setValue('image', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const templateKey = watchedTemplateKey as keyof typeof specComponents | undefined
  const activeSpec = templateKey ? specComponents[templateKey] : null
  const SpecComponent = activeSpec?.form

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className='max-w-[95vw] sm:max-w-[800px] h-[95vh] sm:h-auto sm:max-h-[90vh] rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden flex flex-col'
        aria-describedby={undefined}
      >
        <DialogHeader className='shrink-0 text-start px-8 py-4 bg-muted/5 border-b border-dashed border-muted/50'>
          <DialogTitle className='text-lg font-black tracking-tighter italic text-slate-800 flex items-center gap-3'>
            <div className='size-2 bg-blue-600 rounded-full animate-pulse' />
            {isEdit ? t('engineering.productMgmt.dialog.titleEdit') : t('engineering.productMgmt.dialog.titleCreate')}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {t('engineering.productMgmt.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto px-6 sm:px-8 py-4 scrollbar-hide'>
          <Form {...form}>
            <form
              id='product-form'
              onSubmit={form.handleSubmit(handleFormSubmit, (errors) => {
                logger.error('Form validation failed', errors)
                toast.error(t('engineering.productMgmt.dialog.validationError'))
              })}
              className='space-y-6'
            >
              <ProductBasicInfo
                form={form}
                dynamicTypes={dynamicTypes}
                productTypes={productTypes}
                handleImageUpload={handleImageUpload}
                specOptions={specOptions}
                moldOptions={moldOptions}
                isEdit={isEdit}
              />

              {SpecComponent ? (
                <div className='space-y-2'>
                  {isEdit && activeSpec && (
                    <div className='px-3 py-1 bg-green-600/10 text-green-600 text-[10px] font-bold rounded flex items-center gap-2 w-fit mb-2'>
                      <span>●</span>
                      {t('engineering.productMgmt.dialog.activeTemplate', {
                        label: activeSpec.label,
                      })}
                    </div>
                  )}
                  <SpecComponent
                    form={form}
                    options={{
                      tireType: tireTypeOptions,
                      brakeType: brakeTypeOptions,
                      techSeries: techSeriesOptions,
                      versionLevel: versionLevelOptions,
                    }}
                    selectedVariants={selectedVariants}
                    onVariantToggle={handleVariantToggle}
                    onWeightChange={updateVariantWeight}
                  />
                </div>
              ) : (
                <div className='p-6 border-2 border-dashed rounded-[24px] bg-muted/5 flex flex-col items-center justify-center text-center gap-2 transition-all hover:bg-muted/10'>
                  <div className='p-2 rounded-full bg-background shadow-lg shadow-muted/20'>
                    <Box className='size-5 text-blue-600/30 animate-pulse' />
                  </div>
                  <div className='space-y-1'>
                    <p className='text-[10px] font-black text-slate-800 italic'>
                      {t('engineering.productMgmt.dialog.templatePending')}
                    </p>
                    <p className='text-[9px] font-black text-muted-foreground/30 max-w-[280px]'>
                      {t('engineering.productMgmt.dialog.templateHint')}
                    </p>
                  </div>
                </div>
              )}

              <ProductionRestrictions form={form} />

              <div className='p-3 bg-blue-600/5 border border-dashed border-blue-600/30 rounded-[24px] space-y-1 group transition-all hover:bg-blue-600/10'>
                <div className='flex items-center justify-between border-b border-dashed border-blue-600/30 pb-1'>
                  <span className='text-[10px] font-black text-blue-800 italic'>
                    {t('engineering.productMgmt.dialog.previewTitle')}
                  </span>
                  <Badge variant='outline' className='h-3 text-[8px] font-black border-blue-300 text-blue-700 bg-white px-1'>
                    {t('engineering.productArchive.states.live')}
                  </Badge>
                </div>
                <p className='text-[11px] font-black text-blue-900 dark:text-blue-200 tracking-tighter italic break-all leading-tight'>
                  {specSummary || t('engineering.productArchive.states.unnamed')}
                </p>
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className='shrink-0 px-4 sm:px-8 py-4 border-t border-dashed border-muted/50 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3'>
          <Button
            type='submit'
            form='product-form'
            className={`h-11 sm:h-9 rounded-full px-10 text-[11px] font-black transition-all hover:scale-105 active:scale-95 shadow-xl ${
              selectedVariants.length > 1
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
            }`}
          >
            {selectedVariants.length > 1
              ? t('engineering.productMgmt.dialog.saveBatch', { count: selectedVariants.length })
              : t('engineering.productMgmt.dialog.saveStandard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
