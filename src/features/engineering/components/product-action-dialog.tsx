'use client'

import React, { useEffect, useState } from 'react'
import { type FieldErrors, useWatch } from 'react-hook-form'
import { Box, Trash2 } from 'lucide-react'
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
import { type ProductEditTemplateResolution, getLocalizedSpecComponents, resolveEffectiveTemplate } from './specs'
import { ProductBasicInfo } from './product/product-basic-info'
import { DynamicAttributeSection } from './product/dynamic-attribute-section'
import { ProductionRestrictions } from './product/production-restrictions'
import { useProductForm, type ProductSubmitPayload } from '../hooks/use-product-form'
import { useProductWriteActions } from '../hooks/use-product-write-actions'
import { type Product, type ProductTemplate, type ProductType } from '../data/schema'
import { getCreateProductTemplate } from '../utils/product-create-template-resolution'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { ProductTypeService } from '../services/product-type-service'
import { productTemplateService } from '../services/product-template-service'

const logger = createLogger('ProductActionDialog')

interface ProductActionDialogProps {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (payload: ProductSubmitPayload) => void | Promise<void>
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
    nextCodeDeriveError,
    skuPreview,
    selectedVariants,
    specPreviewSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  } = useProductForm({ currentRow, open, productTypes, onOpenChange, onSubmit })
  const { deleteProduct, isDeletingProduct } = useProductWriteActions()
  const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
  const [boundTemplate, setBoundTemplate] = useState<ProductTemplate | null>(null)
  const [templateResolveError, setTemplateResolveError] = useState<string | null>(null)
  const resolvedTemplateKey = currentRow?.resolvedTemplateKey?.trim() || currentRow?.templateKey?.trim() || ''
  const resolvedTemplateId = currentRow?.resolvedTemplateId?.trim() || ''
  const templateResolutionError = currentRow?.templateResolutionError?.trim() || ''
  const templateResolutionSource = currentRow?.templateResolutionSource?.trim() || ''

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
      if (!watchedTypeId && !resolvedTemplateKey && !resolvedTemplateId) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(null)
        }
        return
      }

      const selectedType = productTypes.find((type) => type.id === watchedTypeId)
      if (!selectedType && !resolvedTemplateKey && !resolvedTemplateId) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(`Template binding resolution failed: product type ${watchedTypeId} was not found in the current dialog context.`)
        }
        logger.error('Template binding resolution failed: product type was not found in dialog context', {
          watchedTypeId,
        })
        return
      }

      try {
        type ResolvedTemplateResult = ProductEditTemplateResolution | {
          template: ProductTemplate | null
          source: string
        }

        const resolveFromBackendAuthority = async () => {
          if (!isEdit) return null

          const templates = await productTemplateService.getTemplates()
          const template = templates.find((item) => item.id === resolvedTemplateId)
            || templates.find((item) => item.componentKey.trim().toUpperCase() === resolvedTemplateKey.toUpperCase())
            || null

          if (template) {
            return {
              template,
              source: templateResolutionSource || 'backendResolvedTemplate',
            }
          }

          return null
        }

        const resolveFromCurrentContext = async () => {
          if (isEdit) {
            const templates = await productTemplateService.getTemplates()
            return resolveEffectiveTemplate(templates, {
              productTypes,
              typeId: watchedTypeId,
              productTemplateKey: resolvedTemplateKey,
            })
          }

          const backendResolution = await ProductTypeService.getTemplateResolution(watchedTypeId || '')
          const templates = await productTemplateService.getTemplates()
          const backendTemplate = templates.find((item) => item.id === backendResolution.resolvedTemplateId)
            || templates.find((item) => item.componentKey.trim().toUpperCase() === (backendResolution.resolvedTemplateKey || '').toUpperCase())
            || null

          if (backendTemplate) {
            return {
              template: backendTemplate,
              source: backendResolution.templateResolutionSource || 'backendCreateTypeResolution',
            }
          }

          return getCreateProductTemplate({
            productTypes,
            typeId: watchedTypeId,
          })
        }

        const resolveFromFreshContext = async () => {
          const [freshProductTypes, freshTemplates] = await Promise.all([
            ProductTypeService.getProductTypes({ isOptions: true }),
            productTemplateService.getTemplates({ fresh: true }),
          ])

          if (isEdit) {
            return resolveEffectiveTemplate(freshTemplates, {
              productTypes: freshProductTypes,
              typeId: watchedTypeId,
              productTemplateKey: resolvedTemplateKey,
            })
          }

          return getCreateProductTemplate({
            productTypes: freshProductTypes,
            typeId: watchedTypeId,
          })
        }

        let result: ResolvedTemplateResult | null = await resolveFromBackendAuthority()
        if (!result) {
          result = await resolveFromCurrentContext()
        }

        if (!result?.template) {
          logger.warn('Template binding unresolved in current dialog context, retrying with fresh metadata', {
            productTypeId: selectedType?.id,
            productTemplateKey: resolvedTemplateKey,
            resolvedTemplateId,
            templateResolutionError,
            mode: isEdit ? 'edit' : 'create',
          })
          result = await resolveFromFreshContext()
        }

        if (cancelled) return

        if (!result) {
          setBoundTemplate(null)
          setTemplateResolveError('Template binding resolution failed: unknown resolution state.')
          return
        }

        const template = result.template
        if (!template) {
          const selectedTypeLabel = selectedType
            ? `${selectedType.name} (${selectedType.id})`
            : `unknown product type (${watchedTypeId || 'missing'})`
          const message = isEdit && (resolvedTemplateKey || templateResolutionError)
            ? `Template binding resolution failed: product type ${selectedTypeLabel} could not resolve an effective template. backendResolution=${templateResolutionError || 'unknown'} templateKey=${resolvedTemplateKey || 'missing'}.`
            : `Template binding resolution failed: product type ${selectedTypeLabel} has no resolvable template binding in its category chain.`
          setBoundTemplate(null)
          setTemplateResolveError(message)
          logger.error('Template binding resolution failed: effective template could not be resolved', {
            productTypeId: selectedType?.id,
            templateId: selectedType?.templateId,
            productTemplateKey: isEdit ? resolvedTemplateKey : undefined,
            resolvedTemplateId: isEdit ? resolvedTemplateId : undefined,
            templateResolutionError: isEdit ? templateResolutionError : undefined,
            mode: isEdit ? 'edit' : 'create',
          })
          return
        }

        setBoundTemplate(template)
        setTemplateResolveError(null)
        logger.info('Resolved effective template for product dialog', {
          productTypeId: selectedType?.id,
          templateId: template.id,
          source: result.source,
          mode: isEdit ? 'edit' : 'create',
        })
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
  }, [currentRow?.resolvedTemplateId, currentRow?.resolvedTemplateKey, currentRow?.templateKey, currentRow?.templateResolutionError, currentRow?.templateResolutionSource, isEdit, productTypes, watchedTypeId, resolvedTemplateId, resolvedTemplateKey, templateResolutionError, templateResolutionSource])

  const componentKey = boundTemplate?.componentKey as keyof typeof specComponents | undefined
  const activeSpec = componentKey ? specComponents[componentKey] : null
  const SpecComponent = activeSpec?.form
  const templateBindingStatus = React.useMemo(() => {
    if (!boundTemplate) return 'none'
    if (attributeBindings.length === 0) return 'missing'

    const templateSignature = [...(boundTemplate.attributeBindings ?? [])]
      .map((item) => `${item.categoryKey}:${item.required ? '1' : '0'}:${item.active === false ? '0' : '1'}`)
      .sort()
      .join('|')
    const typeSignature = [...attributeBindings]
      .map((item) => `${item.categoryKey}:${item.required ? '1' : '0'}:${item.active === false ? '0' : '1'}`)
      .sort()
      .join('|')

    return templateSignature === typeSignature ? 'aligned' : 'drifted'
  }, [attributeBindings, boundTemplate])
  const watchedModelCode = useWatch({ control: form.control, name: 'modelCode' })
  const issuanceBlocked = Boolean(!isEdit && nextCodeDeriveError && (!watchedModelCode || watchedModelCode === '01'))
  const submissionBlocked = Boolean(metadataInitError || templateResolveError || issuanceBlocked)
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

  const handleDelete = async () => {
    if (!currentRow) return

    const confirmed = window.confirm(t('engineering.productArchive.toasts.deleteConfirm'))
    if (!confirmed) return

    try {
      await deleteProduct(currentRow.id)
      toast.success(t('engineering.productArchive.toasts.deleteSuccess'))
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      toast.error(
        t('engineering.productArchive.toasts.deleteFailed', {
          message,
        })
      )
      logger.error('Failed to delete product from action dialog', error)
    }
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
                  skuPreview={skuPreview}
                  templateLabel={activeSpec?.label}
                />

              {metadataInitError ? (
                <div className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-amber-900'>
                  <div className='text-[10px] font-black uppercase tracking-widest'>
                    {t('engineering.productMgmt.metadata.errorTitle')}
                  </div>
                  <p className='mt-1 text-[11px] font-bold leading-relaxed'>
                    {metadataInitError}
                  </p>
                  <p className='mt-1 text-[10px] font-medium opacity-80'>
                    {t('engineering.productMgmt.metadata.errorHint')}
                  </p>
                </div>
              ) : null}

              {nextCodeDeriveError ? (
                <div className='rounded-[24px] border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-orange-900'>
                  <div className='text-[10px] font-black uppercase tracking-widest'>Code Issuance Failed</div>
                  <p className='mt-1 text-[11px] font-bold leading-relaxed'>
                    {nextCodeDeriveError}
                  </p>
                  <p className='mt-1 text-[10px] font-medium opacity-80'>
                    {!isEdit && (!watchedModelCode || watchedModelCode === '01')
                      ? 'Authority code issuance is unavailable. Resolve the backend issuance error or fill a valid model code before saving.'
                      : 'Authority code issuance failed. Verify the backend issuer before continuing.'}
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

              {boundTemplate ? (
                <div className='rounded-[24px] border border-dashed border-blue-300 bg-blue-50 px-4 py-3 text-blue-900'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='text-[10px] font-black uppercase tracking-widest'>
                      {t('engineering.productMgmt.dialog.attributeBindingTemplateLabel', {
                        name: boundTemplate.name,
                      })}
                    </div>
                    <Badge variant='outline' className='border-blue-200 bg-white text-blue-700'>
                      {activeSpec?.label || boundTemplate.componentKey}
                    </Badge>
                  </div>
                  <p className='mt-2 text-[11px] font-bold leading-relaxed'>
                    {templateBindingStatus === 'aligned'
                      ? t('engineering.productMgmt.dialog.attributeBindingAligned')
                      : templateBindingStatus === 'missing'
                        ? t('engineering.productMgmt.dialog.attributeBindingMissing')
                        : t('engineering.productMgmt.dialog.attributeBindingDrifted')}
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
                  {specPreviewSummary || t('engineering.productArchive.states.unnamed')}
                </p>
              </div>
            </form>
          </Form>
        </div>
        <DialogFooter className='shrink-0 px-4 sm:px-8 py-4 border-t border-dashed border-muted/50 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3'>
          {isEdit ? (
            <Button
              type='button'
              variant='outline'
              disabled={isDeletingProduct}
              onClick={() => void handleDelete()}
              className='h-11 sm:h-9 rounded-full px-10 text-[11px] font-black transition-all hover:scale-105 active:scale-95 shadow-xl border-destructive/20 bg-white text-destructive hover:bg-destructive/5 hover:text-destructive shadow-destructive/10'
            >
              <Trash2 className='mr-2 size-4' />
              {isDeletingProduct ? t('engineering.productMgmt.dialog.deleting') : t('engineering.productMgmt.dialog.delete')}
            </Button>
          ) : null}
          <Button
            type='submit'
            form='product-form'
            disabled={submissionBlocked || isDeletingProduct}
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
