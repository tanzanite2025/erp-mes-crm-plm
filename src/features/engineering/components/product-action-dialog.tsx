'use client'

import React from 'react'
import { type FieldErrors, useWatch } from 'react-hook-form'
import { Box, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { createLogger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
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
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { type Product, type ProductType } from '../data/schema'
import {
  useProductForm,
  type ProductSubmitPayload,
} from '../hooks/use-product-form'
import { useProductWriteActions } from '../hooks/use-product-write-actions'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { ProductAndBOMFieldResponsibilityNotice } from './product-and-bom-field-responsibility-explanations'
import {
  productCreationDialogViewportClassName,
  productCreationGuideDialogContentClassName,
} from './product-creation-dialog-layout.styles'
import { DynamicAttributeSection } from './product/dynamic-attribute-section'
import { ProductBasicInfo } from './product/product-basic-info'
import { productFormTypographyClassNames } from './product/product-form-typography.styles'
import { ProductLinkedBomRecordsReadOnlySection } from './product/product-linked-bom-records-read-only-section'
import { ProductionRestrictions } from './product/production-restrictions'
import { getLocalizedSpecComponents } from './specs'

const logger = createLogger('ProductActionDialog')

interface ProductActionDialogProps {
  currentRow?: Product
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit?: (
    payload: ProductSubmitPayload
  ) => Promise<Product[] | void | null> | Product[] | void | null
  onSaved?: (products: Product[]) => void
  productTypes?: ProductType[]
  initialTypeId?: string
  wizardHeader?: React.ReactNode
}

function getFirstErrorPath(
  errors: FieldErrors<Product>,
  prefix = ''
): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue

    const nextPath = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'object' && 'message' in value && value.message) {
      return nextPath
    }

    if (typeof value === 'object') {
      const nestedPath = getFirstErrorPath(
        value as FieldErrors<Product>,
        nextPath
      )
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
    initialTypeId,
    wizardHeader,
  } = props

  const {
    form,
    isEdit,
    dynamicTypes,
    moldOptions,
    specOptions,
    metadataInitError,
    metadataReady,
    nextCodeDeriveError,
    boundTemplate,
    templateResolveError,
    templateResolutionPending,
    specPreviewTitle,
    specPreviewSummary,
    specPreviewAggregateLabel = '',
    specPreviewV2 = null,
    specPreviewItems = [],
    handleFormSubmit,
  } = useProductForm({
    currentRow,
    open,
    productTypes,
    onOpenChange,
    onSubmit,
    onSaved,
    initialTypeId,
  })
  const { deleteProduct, isDeletingProduct } = useProductWriteActions()

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

  const componentKey = boundTemplate?.componentKey as
    | keyof typeof specComponents
    | undefined
  const activeSpec = componentKey ? specComponents[componentKey] : null
  const SpecComponent = activeSpec?.form
  const effectiveAttributeBindings = React.useMemo(
    () => boundTemplate?.attributeBindings ?? [],
    [boundTemplate?.attributeBindings]
  )
  const watchedModelCode = useWatch({
    control: form.control,
    name: 'modelCode',
  })
  const issuanceBlocked = Boolean(
    !isEdit &&
    nextCodeDeriveError &&
    (!watchedModelCode || watchedModelCode === '01')
  )
  const metadataPending = Boolean(open && !metadataInitError && !metadataReady)
  const submissionBlocked = Boolean(
    metadataInitError ||
    metadataPending ||
    templateResolveError ||
    templateResolutionPending ||
    issuanceBlocked
  )
  const errorLabelMap: Record<string, string> = {
    typeId: t('engineering.productMgmt.form.category'),
    modelCode: t('engineering.productMgmt.form.modelCode'),
    name: t('engineering.productMgmt.form.category'),
    sku: t('engineering.productMgmt.form.sku'),
    engineeringSpecId: t('engineering.productMgmt.form.spec'),
    moldGroupId: t('engineering.productMgmt.form.mold'),
    moldGroup: t('engineering.productMgmt.form.mold'),
    description: t('engineering.productMgmt.form.memo'),
    barcodeConfig: t('engineering.productMgmt.barcode.configTitle'),
    'barcodeConfig.appearanceCode': t(
      'engineering.productMgmt.barcode.appearanceCodeLabel'
    ),
    'barcodeConfig.holes': t('engineering.productMgmt.barcode.holesLabel'),
    'barcodeConfig.serialNumber': t(
      'engineering.productMgmt.barcode.serialLabel'
    ),
    attachments: t('engineering.productMgmt.attachments.uploadTitle'),
  }
  const baseModelError = form.formState.errors.typeId
    ? t('engineering.productMgmt.form.categoryRequired')
    : null

  const handleDelete = async () => {
    if (!currentRow) return

    const confirmed = await requestApplicationConfirmation(
      t('engineering.productArchive.toasts.deleteConfirm')
    )
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
        className={
          wizardHeader
            ? productCreationGuideDialogContentClassName
            : cn(
                productCreationDialogViewportClassName,
                'flex flex-col gap-0 overflow-hidden rounded-[32px] border-none p-0 shadow-2xl'
              )
        }
        aria-describedby={undefined}
      >
        {wizardHeader}
        <DialogHeader className='shrink-0 border-b border-dashed border-muted/50 bg-muted/5 px-8 py-3 text-start'>
          <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tighter text-foreground'>
            <div className='size-2 animate-pulse rounded-full bg-blue-600' />
            {wizardHeader
              ? t('engineering.productCreationGuide.steps.product.title')
              : isEdit
                ? t('engineering.productMgmt.dialog.titleEdit')
                : t('engineering.productMgmt.dialog.titleCreate')}
          </DialogTitle>
          <DialogDescription className='sr-only'>
            {t(
              wizardHeader
                ? 'engineering.productCreationGuide.steps.product.action'
                : 'engineering.productMgmt.dialog.description'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className='scrollbar-hide min-h-0 flex-1 overflow-y-auto px-6 py-3 sm:px-8'>
          <Form {...form}>
            <form
              id='product-form'
              onSubmit={form.handleSubmit(handleFormSubmit, (errors) => {
                const firstErrorPath = getFirstErrorPath(errors)
                const invalidFieldLabel = firstErrorPath
                  ? (errorLabelMap[firstErrorPath] ?? firstErrorPath)
                  : null

                logger.error('Form validation failed', errors)
                toast.error(
                  invalidFieldLabel
                    ? `${t('engineering.productMgmt.dialog.validationError')}: ${invalidFieldLabel}`
                    : t('engineering.productMgmt.dialog.validationError')
                )
              })}
              className='space-y-3'
            >
              <ProductAndBOMFieldResponsibilityNotice context='product' t={t} />
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

              {!wizardHeader && (
                <ProductLinkedBomRecordsReadOnlySection
                  productId={currentRow?.id}
                  onNavigateToBomManagement={() => onOpenChange(false)}
                />
              )}

              {baseModelError ? (
                <div className='rounded-[20px] border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-amber-900'>
                  <div className={productFormTypographyClassNames.helper}>
                    {t('engineering.productMgmt.form.category')}
                  </div>
                  <p
                    className={cn(
                      'mt-1',
                      productFormTypographyClassNames.helper
                    )}
                  >
                    {baseModelError}
                  </p>
                </div>
              ) : null}

              {templateResolveError ? (
                <div className='rounded-2xl border border-dashed border-red-300 bg-red-50/90 px-4 py-2 text-red-900'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0'>
                      <div
                        className={cn(
                          'text-red-700',
                          productFormTypographyClassNames.helper
                        )}
                      >
                        Template Binding Broken
                      </div>
                      <p className={productFormTypographyClassNames.helper}>
                        {templateResolveError}
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className='h-5 w-fit border-red-200 bg-white text-red-700'
                    >
                      BLOCKED
                    </Badge>
                  </div>
                </div>
              ) : null}

              {boundTemplate && !wizardHeader ? (
                <div className='rounded-2xl border border-dashed border-blue-300 bg-blue-50/90 px-3 py-1.5 text-blue-900'>
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0'>
                      <div
                        className={cn(
                          'text-blue-700',
                          productFormTypographyClassNames.helper
                        )}
                      >
                        Template Status
                      </div>
                      <p
                        className={cn(
                          'truncate',
                          productFormTypographyClassNames.helper
                        )}
                      >
                        {t(
                          'engineering.productMgmt.dialog.attributeBindingTemplateLabel',
                          {
                            name: boundTemplate.name,
                          }
                        )}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant='outline'
                        className='h-5 border-blue-200 bg-white text-blue-700'
                      >
                        {activeSpec?.label || boundTemplate.componentKey}
                      </Badge>
                      <Badge
                        variant='outline'
                        className='h-5 border-blue-200 bg-white text-blue-700'
                      >
                        {t(
                          'engineering.categoryArchive.dialog.templateAssemblyCount',
                          {
                            count: effectiveAttributeBindings.length,
                          }
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : null}

              {metadataInitError ? (
                <div className='rounded-[24px] border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-amber-900'>
                  <div className={productFormTypographyClassNames.helper}>
                    {t('engineering.productMgmt.metadata.errorTitle')}
                  </div>
                  <p
                    className={cn(
                      'mt-1',
                      productFormTypographyClassNames.helper
                    )}
                  >
                    {metadataInitError}
                  </p>
                  <p
                    className={cn(
                      'mt-1',
                      productFormTypographyClassNames.helper
                    )}
                  >
                    {t('engineering.productMgmt.metadata.errorHint')}
                  </p>
                </div>
              ) : null}

              {nextCodeDeriveError ? (
                <div className='rounded-[24px] border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-orange-900'>
                  <div className={productFormTypographyClassNames.helper}>
                    Code Issuance Failed
                  </div>
                  <p
                    className={cn(
                      'mt-1',
                      productFormTypographyClassNames.helper
                    )}
                  >
                    {nextCodeDeriveError}
                  </p>
                  <p
                    className={cn(
                      'mt-1',
                      productFormTypographyClassNames.helper
                    )}
                  >
                    {!isEdit && (!watchedModelCode || watchedModelCode === '01')
                      ? 'Authority code issuance is unavailable. Resolve the backend issuance error or fill a valid model code before saving.'
                      : 'Authority code issuance failed. Verify the backend issuer before continuing.'}
                  </p>
                </div>
              ) : null}

              <DynamicAttributeSection
                form={form}
                locale={locale}
                bindings={effectiveAttributeBindings}
                excludeCategoryKeys={[PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version]}
              />

              {SpecComponent ? (
                <div className='space-y-2'>
                  <SpecComponent form={form} />
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-dashed bg-muted/5 p-6 text-center transition-all hover:bg-muted/10'>
                  <div className='rounded-full bg-background p-2 shadow-lg shadow-muted/20'>
                    <Box className='size-5 animate-pulse text-blue-600/30' />
                  </div>
                  <div className='space-y-1'>
                    <p
                      className={cn(
                        'text-foreground',
                        productFormTypographyClassNames.helper
                      )}
                    >
                      {t('engineering.productMgmt.dialog.templatePending')}
                    </p>
                    <p
                      className={cn(
                        'max-w-[280px] text-muted-foreground',
                        productFormTypographyClassNames.helper
                      )}
                    >
                      {t('engineering.productMgmt.dialog.templateHint')}
                    </p>
                  </div>
                </div>
              )}

              <ProductionRestrictions
                restrictions={form.watch('restrictions') || []}
                setRestrictions={(nextRestrictions) => {
                  form.setValue('restrictions', nextRestrictions, {
                    shouldDirty: true,
                  })
                }}
              />
            </form>
          </Form>
        </div>
        <DialogFooter className='flex shrink-0 flex-col gap-2 border-t border-dashed border-muted/50 bg-background px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-8'>
          <div className='min-w-0 flex-1 rounded-[20px] border border-dashed border-blue-600/30 bg-blue-600/5 px-3 py-2'>
            <div className='flex items-center justify-between gap-3 border-b border-dashed border-blue-600/30 pb-1'>
              <span
                className={cn(
                  'text-blue-800 dark:text-blue-300',
                  productFormTypographyClassNames.helper
                )}
              >
                {t('engineering.productMgmt.dialog.previewTitle')}
              </span>
              <Badge
                variant='outline'
                className={cn(
                  'min-h-5 border-blue-300 bg-background px-1 text-blue-700 dark:border-blue-800 dark:text-blue-300',
                  productFormTypographyClassNames.badge
                )}
              >
                {t('engineering.productArchive.states.live')}
              </Badge>
            </div>
            <p
              className={cn(
                'mt-1 break-all text-blue-900 dark:text-blue-200',
                productFormTypographyClassNames.preview
              )}
            >
              {specPreviewAggregateLabel ||
                (specPreviewV2
                  ? specPreviewTitle || specPreviewV2.title
                  : specPreviewSummary ||
                    t('engineering.productArchive.states.unnamed'))}
            </p>
            {!wizardHeader && specPreviewItems.length > 0 && (
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {specPreviewItems.map((item) => (
                  <Badge
                    key={item.key}
                    variant='outline'
                    className={cn(
                      'min-h-5 rounded-full border-dashed px-2 font-maple-ui',
                      productFormTypographyClassNames.badge,
                      item.empty
                        ? 'border-slate-200 bg-background text-muted-foreground dark:border-slate-700'
                        : 'border-blue-300 bg-background text-blue-700 dark:border-blue-800 dark:text-blue-300'
                    )}
                  >
                    {item.label}: {item.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end'>
            {isEdit && currentRow && !wizardHeader ? (
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.product}
                targetId={currentRow.id}
                targetName={currentRow.name}
                label={t('common.audit.trigger')}
              />
            ) : null}
            {isEdit && !wizardHeader ? (
              <Button
                type='button'
                variant='outline'
                disabled={isDeletingProduct}
                onClick={() => void handleDelete()}
                className={cn(
                  'h-11 rounded-full border-destructive/20 bg-background px-10 text-destructive shadow-xl shadow-destructive/10 transition-all hover:scale-105 hover:bg-destructive/5 hover:text-destructive active:scale-95 sm:h-9',
                  productFormTypographyClassNames.button
                )}
              >
                <Trash2 className='mr-2 size-4' />
                {isDeletingProduct
                  ? t('engineering.productMgmt.dialog.deleting')
                  : t('engineering.productMgmt.dialog.delete')}
              </Button>
            ) : null}
            <Button
              type='submit'
              form='product-form'
              disabled={submissionBlocked || isDeletingProduct}
              className={cn(
                'h-11 rounded-full bg-blue-600 px-10 text-white shadow-xl shadow-blue-500/30 transition-all hover:scale-105 hover:bg-blue-700 active:scale-95 sm:h-9',
                productFormTypographyClassNames.button
              )}
            >
              {t(
                wizardHeader
                  ? 'engineering.productCreationGuide.saveProductAndContinue'
                  : 'engineering.productMgmt.dialog.saveStandard'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
