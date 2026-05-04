'use client'

import React, { useEffect, useState } from 'react'
import { type FieldErrors, useWatch } from 'react-hook-form'
import { Box, Trash2 } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
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
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { createLogger } from '@/lib/logger'
import { getLocalizedSpecComponents } from './specs'
import { ProductBasicInfo } from './product/product-basic-info'
import { DynamicAttributeSection } from './product/dynamic-attribute-section'
import { ProductionRestrictions } from './product/production-restrictions'
import { useProductForm, type ProductSubmitPayload } from '../hooks/use-product-form'
import { useProductWriteActions } from '../hooks/use-product-write-actions'
import { type Product, type ProductTemplate, type ProductType } from '../data/schema'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { areSameProductAttributeCategoryKey } from '../utils/product-attribute-machine-value'
import { ProductTypeService, type ProductTypeTemplateResolution } from '../services/product-type-service'
import { productTemplateService } from '../services/product-template-service'

const logger = createLogger('ProductActionDialog')

interface ProductActionDialogProps {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (payload: ProductSubmitPayload) => Promise<Product[] | void> | Product[] | void
  onSaved?: (products: Product[]) => void
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
    onSaved,
    productTypes = [],
  } = props

  const {
    form,
    isEdit,
    dynamicTypes,
    attributeCategories = [],
    attributeOptions = [],
    versionLevelOptions,
    moldOptions,
    specOptions,
    metadataInitError,
    metadataReady,
    nextCodeDeriveError,
    selectedVariants,
    specPreviewSummary,
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  } = useProductForm({ currentRow, open, productTypes, onOpenChange, onSubmit, onSaved })
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
      const authorityTemplateId = isEdit ? resolvedTemplateId : ''
      const authorityTemplateKey = isEdit ? resolvedTemplateKey : ''
      const authorityResolutionError = isEdit ? templateResolutionError : ''

      if (!isEdit && !watchedTypeId) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(null)
        }
        return
      }

      const selectedType = productTypes.find((type) => type.id === watchedTypeId)
      try {
        const resolveTemplateEntity = async (params: { templateId?: string; templateKey?: string }) => {
          const findTemplate = (templates: ProductTemplate[]) => {
            const normalizedTemplateId = params.templateId?.trim() || ''
            const normalizedTemplateKey = params.templateKey?.trim().toUpperCase() || ''

            return templates.find((item) => item.id === normalizedTemplateId)
              || templates.find((item) => item.componentKey.trim().toUpperCase() === normalizedTemplateKey)
              || null
          }

          const templates = await productTemplateService.getTemplates()
          const cachedMatch = findTemplate(templates)
          if (cachedMatch) {
            return cachedMatch
          }

          const freshTemplates = await productTemplateService.getTemplates({ fresh: true })
          return findTemplate(freshTemplates)
        }

        const resolvedAuthority: ProductTypeTemplateResolution = isEdit
          ? {
              resolvedTemplateId: authorityTemplateId,
              resolvedTemplateKey: authorityTemplateKey,
              templateResolutionSource: templateResolutionSource || 'backendResolvedTemplate',
              templateResolutionError: authorityResolutionError,
            }
          : await ProductTypeService.getTemplateResolution(watchedTypeId || '')
        const authorityTemplate = await resolveTemplateEntity({
          templateId: resolvedAuthority.resolvedTemplateId,
          templateKey: resolvedAuthority.resolvedTemplateKey,
        })

        if (cancelled) return

        const template = authorityTemplate
        if (!template) {
          const selectedTypeLabel = selectedType
            ? `${selectedType.name} (${selectedType.id})`
            : `unknown product type (${watchedTypeId || 'missing'})`
          const resolutionError = resolvedAuthority.templateResolutionError || ''
          const resolutionTemplateKey = resolvedAuthority.resolvedTemplateKey || ''
          const message = resolutionTemplateKey || resolutionError
            ? `Template binding resolution failed: product type ${selectedTypeLabel} could not resolve an effective template. backendResolution=${resolutionError || 'unknown'} templateKey=${resolutionTemplateKey || 'missing'}.`
            : `Template binding resolution failed: product type ${selectedTypeLabel} has no resolvable template binding in service authority.`
          setBoundTemplate(null)
          setTemplateResolveError(message)
          logger.error('Template binding resolution failed: authority template could not be mapped', {
            productTypeId: selectedType?.id,
            templateId: resolvedAuthority.resolvedTemplateId,
            productTemplateKey: resolutionTemplateKey || undefined,
            resolvedTemplateId: resolvedAuthority.resolvedTemplateId,
            templateResolutionError: resolutionError || undefined,
            mode: isEdit ? 'edit' : 'create',
          })
          return
        }

        setBoundTemplate(template)
        setTemplateResolveError(null)
        logger.info('Resolved authority template for product dialog', {
          productTypeId: selectedType?.id,
          templateId: template.id,
          source: resolvedAuthority.templateResolutionSource || (isEdit ? 'backendResolvedTemplate' : 'backendCreateTypeResolution'),
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
  const effectiveAttributeBindings = React.useMemo(
    () => boundTemplate?.attributeBindings ?? [],
    [boundTemplate?.attributeBindings]
  )
  const handleDynamicAttributeValueChange = React.useCallback((categoryKey: string, nextValue: string) => {
    if (!areSameProductAttributeCategoryKey(categoryKey, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)) {
      return
    }

    const nextVersionLevel = nextValue.trim()
    selectedVariants
      .filter((variant) => variant.level !== nextVersionLevel)
      .forEach((variant) => handleVariantToggle(variant.level, false))

    if (nextVersionLevel && !selectedVariants.some((variant) => variant.level === nextVersionLevel)) {
      handleVariantToggle(nextVersionLevel, true)
    }
  }, [handleVariantToggle, selectedVariants])
  const watchedModelCode = useWatch({ control: form.control, name: 'modelCode' })
  const issuanceBlocked = Boolean(!isEdit && nextCodeDeriveError && (!watchedModelCode || watchedModelCode === '01'))
  const templateResolutionPending = Boolean(
    open
      && !templateResolveError
      && !boundTemplate
      && (watchedTypeId || resolvedTemplateKey || resolvedTemplateId)
  )
  const metadataPending = Boolean(open && !metadataInitError && !metadataReady)
  const submissionBlocked = Boolean(
    metadataInitError
      || metadataPending
      || templateResolveError
      || templateResolutionPending
      || issuanceBlocked
  )
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
        className='max-w-[95vw] sm:max-w-[85vw] h-[95vh] sm:h-[90vh] sm:max-h-[90vh] rounded-[32px] border-none shadow-2xl p-0 gap-0 overflow-hidden flex flex-col'
        aria-describedby={undefined}
      >
        <DialogHeader className='shrink-0 text-start px-8 py-3 bg-muted/5 border-b border-dashed border-muted/50'>
          <DialogTitle className='text-lg font-black tracking-tighter italic text-slate-800 flex items-center gap-3'>
            <div className='size-2 bg-blue-600 rounded-full animate-pulse' />
            {isEdit ? t('engineering.productMgmt.dialog.titleEdit') : t('engineering.productMgmt.dialog.titleCreate')}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {t('engineering.productMgmt.dialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className='flex-1 overflow-y-auto px-6 sm:px-8 py-3 scrollbar-hide'>
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
              className='space-y-3'
            >
                <ProductBasicInfo
                  form={form}
                  dynamicTypes={dynamicTypes}
                productTypes={productTypes}
                handleImageUpload={handleImageUpload}
                  specOptions={specOptions}
                  moldOptions={moldOptions}
                  isEdit={isEdit}
                  templateLabel={boundTemplate?.name ?? activeSpec?.label}
                />

              {templateResolveError ? (
                <div className='rounded-2xl border border-dashed border-red-300 bg-red-50/90 px-4 py-2 text-red-900'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0'>
                      <div className='text-[9px] font-black uppercase tracking-widest text-red-700'>Template Binding Broken</div>
                      <p className='text-[10px] font-black leading-tight'>
                        {templateResolveError}
                      </p>
                    </div>
                    <Badge variant='outline' className='h-5 w-fit border-red-200 bg-white text-red-700'>
                      BLOCKED
                    </Badge>
                  </div>
                </div>
              ) : null}

              {boundTemplate ? (
                <div className='rounded-2xl border border-dashed border-blue-300 bg-blue-50/90 px-3 py-1.5 text-blue-900'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0'>
                      <div className='text-[9px] font-black uppercase tracking-widest text-blue-700'>Template Status</div>
                      <p className='truncate text-[10px] font-black leading-tight'>
                        {t('engineering.productMgmt.dialog.attributeBindingTemplateLabel', {
                          name: boundTemplate.name,
                        })}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='h-5 border-blue-200 bg-white text-blue-700'>
                        {activeSpec?.label || boundTemplate.componentKey}
                      </Badge>
                      <Badge variant='outline' className='h-5 border-blue-200 bg-white text-blue-700'>
                        {t('engineering.categoryArchive.dialog.templateAssemblyCount', {
                          count: effectiveAttributeBindings.length,
                        })}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : null}

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

              <DynamicAttributeSection
                form={form}
                locale={locale}
                categories={attributeCategories}
                options={attributeOptions}
                bindings={effectiveAttributeBindings}
                onAttributeValueChange={handleDynamicAttributeValueChange}
              />

              {SpecComponent ? (
                <div className='space-y-1.5'>
                  {isEdit && activeSpec && (
                    <div className='px-3 py-0.5 bg-green-600/10 text-green-600 text-[10px] font-bold rounded flex items-center gap-2 w-fit mb-1'>
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
            </form>
          </Form>
        </div>
        <DialogFooter className='shrink-0 px-4 sm:px-8 py-2.5 border-t border-dashed border-muted/50 bg-white flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
          <div className='min-w-0 flex-1 rounded-[20px] border border-dashed border-blue-600/30 bg-blue-600/5 px-3 py-2'>
            <div className='flex items-center justify-between gap-3 border-b border-dashed border-blue-600/30 pb-1'>
              <span className='text-[10px] font-black text-blue-800 italic'>
                {t('engineering.productMgmt.dialog.previewTitle')}
              </span>
              <Badge variant='outline' className='h-4 text-[8px] font-black border-blue-300 text-blue-700 bg-white px-1'>
                {t('engineering.productArchive.states.live')}
              </Badge>
            </div>
            <p className='mt-1 text-[11px] font-black text-blue-900 dark:text-blue-200 tracking-tighter italic break-all leading-tight'>
              {specPreviewSummary || t('engineering.productArchive.states.unnamed')}
            </p>
          </div>
          <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end'>
            {isEdit && currentRow ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.product}
                targetId={currentRow.id}
                targetName={currentRow.name}
                label={t('common.audit.trigger')}
              />
            ) : null}
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
