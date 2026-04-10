'use client'

import React, { useEffect, useState } from 'react'
import { type FieldErrors, useWatch } from 'react-hook-form'
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
import { getEffectiveTemplate, getLocalizedSpecComponents } from './specs'
import { ProductBasicInfo } from './product/product-basic-info'
import { DynamicAttributeSection } from './product/dynamic-attribute-section'
import { ProductionRestrictions } from './product/production-restrictions'
import { useProductForm } from '../hooks/use-product-form'
import { type Product, type ProductTemplate, type ProductType } from '../data/schema'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'

const logger = createLogger('ProductActionDialog')

interface ProductActionDialogProps {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: Product | Product[]) => void | Promise<void>
  productTypes?: ProductType[]
}

function getFirstErrorPath(errors: FieldErrors<Product>, prefix = ''): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue

    const nextPath = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && 'message' in value && value.message) {
      return nextPath
    }

    if (typeof value === 'object') {
      const nestedPath = getFirstErrorPath(value as FieldErrors<Product>, nextPath)
      if (nestedPath) return nestedPath
    }
  }

  return null
}

export function ProductActionDialog(props: ProductActionDialogProps) {
  const { t, locale } = useLanguage()
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
    attributeCategories,
    attributeOptions,
    attributeBindings,
    versionLevelOptions,
    moldOptions,
    specOptions,
    metadataInitError,
    selectedVariants,
    specSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  } = useProductForm({ currentRow, open, productTypes, onOpenChange, onSubmit })
  const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
  const [boundTemplate, setBoundTemplate] = useState<ProductTemplate | null>(null)
  const [templateResolveError, setTemplateResolveError] = useState<string | null>(null)

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

  useEffect(() => {
    let cancelled = false

    const resolveBoundTemplate = async () => {
      if (!watchedTypeId) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(null)
        }
        return
      }

      const selectedType = productTypes.find((type) => type.id === watchedTypeId)
      if (!selectedType) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(`Template binding resolution failed: product type ${watchedTypeId} was not found in the current dialog context.`)
        }
        logger.error('Template binding resolution failed: product type was not found in dialog context', {
          watchedTypeId,
        })
        return
      }

      if (!selectedType.templateId) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(null)
        }
        return
      }

      try {
        const template = await getEffectiveTemplate(selectedType)
        if (cancelled) return

        if (!template) {
          const message = `Template binding resolution failed: product type ${selectedType.name} (${selectedType.id}) references template ${selectedType.templateId}, but that template could not be resolved.`
          setBoundTemplate(null)
          setTemplateResolveError(message)
          logger.error('Template binding resolution failed: referenced template could not be resolved', {
            productTypeId: selectedType.id,
            templateId: selectedType.templateId,
          })
          return
        }

        setBoundTemplate(template)
        setTemplateResolveError(null)
      } catch (error) {
        if (cancelled) return

        const message = error instanceof Error
          ? `Template binding resolution failed: ${error.message}`
          : 'Template binding resolution failed: unknown error while loading template metadata.'
        setBoundTemplate(null)
        setTemplateResolveError(message)
        logger.error('Template binding resolution failed while loading template metadata', error)
      }
    }

    void resolveBoundTemplate()

    return () => {
      cancelled = true
    }
  }, [productTypes, watchedTypeId])

  const componentKey = boundTemplate?.componentKey as keyof typeof specComponents | undefined
  const activeSpec = componentKey ? specComponents[componentKey] : null
  const SpecComponent = activeSpec?.form
  const submissionBlocked = Boolean(metadataInitError || templateResolveError)
  const errorLabelMap: Record<string, string> = {
    typeId: t('engineering.productMgmt.form.category'),
    modelCode: t('engineering.productMgmt.form.modelCode'),
    name: t('engineering.productMgmt.form.prodName'),
    sku: t('engineering.productMgmt.form.sku'),
    engineeringSpecId: t('engineering.productMgmt.form.spec'),
    moldGroup: t('engineering.productMgmt.form.mold'),
    description: t('engineering.productMgmt.form.memo'),
    barcodeConfig: t('engineering.productMgmt.barcode.configTitle'),
    'barcodeConfig.appearanceCode': t('engineering.productMgmt.barcode.appearanceCodeLabel'),
    'barcodeConfig.holes': t('engineering.productMgmt.barcode.holesLabel'),
    'barcodeConfig.serialNumber': t('engineering.productMgmt.barcode.serialLabel'),
    attachments: t('engineering.productMgmt.attachments.uploadTitle'),
  }

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
                const firstErrorPath = getFirstErrorPath(errors)
                const invalidFieldLabel = firstErrorPath ? errorLabelMap[firstErrorPath] ?? firstErrorPath : null

                logger.error('Form validation failed', errors)
                toast.error(
                  invalidFieldLabel
                    ? `${t('engineering.productMgmt.dialog.validationError')}: ${invalidFieldLabel}`
                    : t('engineering.productMgmt.dialog.validationError')
                )
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
                templateLabel={activeSpec?.label}
              />

              {metadataInitError ? (
                <div className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-amber-900'>
                  <div className='text-[10px] font-black uppercase tracking-widest'>Metadata Link Broken</div>
                  <p className='mt-1 text-[11px] font-bold leading-relaxed'>
                    {metadataInitError}
                  </p>
                  <p className='mt-1 text-[10px] font-medium opacity-80'>
                    Restart the backend on `http://localhost:8080` so the template, dynamic attribute category, and binding endpoints come from the same server version.
                  </p>
                </div>
              ) : null}

              {templateResolveError ? (
                <div className='rounded-[24px] border border-dashed border-red-300 bg-red-50 px-4 py-3 text-red-900'>
                  <div className='text-[10px] font-black uppercase tracking-widest'>Template Binding Broken</div>
                  <p className='mt-1 text-[11px] font-bold leading-relaxed'>
                    {templateResolveError}
                  </p>
                  <p className='mt-1 text-[10px] font-medium opacity-80'>
                    Fix the selected product type template binding or restart the backend with the latest template endpoints before saving this product.
                  </p>
                </div>
              ) : null}

              <DynamicAttributeSection
                form={form}
                locale={locale}
                categories={attributeCategories}
                options={attributeOptions}
                bindings={attributeBindings}
                excludeCategoryKeys={[PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version]}
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
                      versionCategoryOptions: versionLevelOptions,
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

              <ProductionRestrictions
                restrictions={form.watch('restrictions') || []}
                setRestrictions={(nextRestrictions) => {
                  form.setValue('restrictions', nextRestrictions, { shouldDirty: true })
                }}
              />

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
            disabled={submissionBlocked}
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
