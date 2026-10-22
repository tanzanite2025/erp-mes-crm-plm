import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BOMActionDialog } from '@/features/product-structure/components/bom-action-dialog'
import { useBOMWriteActions } from '@/features/product-structure/hooks/use-bom-write-actions'
import type { SaveBOMInput } from '@/features/product-structure/mutation-types'
import type { ProductCreationOperationGuideStep } from '../../data/build-product-creation-operation-guide-steps'
import type {
  ProductCreationGuideProgress,
  ProductCreationGuideStepResult,
} from '../../data/product-creation-operation-guide-progress'
import type { ProductTemplate, ProductType } from '../../data/schema'
import { useProductAttributeCatalogQueries } from '../../hooks/use-product-attribute-catalog-queries'
import type { ProductSubmitPayload } from '../../hooks/use-product-form'
import { useProductTypeWriteActions } from '../../hooks/use-product-type-write-actions'
import { useProductWriteActions } from '../../hooks/use-product-write-actions'
import type { SaveProductTypeInput } from '../../mutation-types'
import {
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
  productDetailQueryKey,
} from '../../query-keys'
import { ProductCoreService } from '../../services/product-core-service'
import { productTemplateService } from '../../services/product-template-service'
import { ProductTypeService } from '../../services/product-type-service'
import { areSameProductAttributeCategoryKey } from '../../utils/product-attribute-machine-value'
import {
  getProductTemplateAttributeLevelOneCategoryName,
  getProductTemplateAttributeLevelTwoOptionLabel,
} from '../../utils/product-attribute-utils'
import { resolveEffectiveTemplate } from '../../utils/product-template-resolution'
import { buildProductTypeHierarchyMetaMap } from '../../utils/product-type-tree'
import { ProductActionDialog } from '../product-action-dialog'
import { ProductTypeActionDialog } from '../product-type-action-dialog'

const logger = createLogger('ProductCreationGuideBusinessOperationDialog')

type ProductCreationGuideOperationDialogProps = {
  step: ProductCreationOperationGuideStep
  progress: ProductCreationGuideProgress
  wizardHeader: ReactNode
  onBusyChange: (busy: boolean) => void
  onClose: () => void
  onCompleted: (result: ProductCreationGuideStepResult) => void
}

export function ProductCreationGuideBusinessOperationDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  switch (props.step.key) {
    case 'template':
      return <ProductCreationGuideTemplateSelectionDialog {...props} />
    case 'baseModel':
      return <ProductCreationGuideBaseModelSelectionDialog {...props} />
    case 'product':
      return <ProductCreationGuideProductGenerationDialog {...props} />
    case 'bom':
      return <ProductCreationGuideBomCreationDialog {...props} />
  }
}

function useProductCreationGuideSubmissionLock(
  isBusy: boolean,
  onBusyChange: (busy: boolean) => void
) {
  useEffect(() => {
    onBusyChange(isBusy)
    return () => onBusyChange(false)
  }, [isBusy, onBusyChange])
}

function ProductCreationGuideConfigurationDialog({
  step,
  onClose,
  wizardHeader,
  children,
  onConfirm,
  disabled,
  isConfirming = false,
  showConfirm = true,
}: Pick<
  ProductCreationGuideOperationDialogProps,
  'step' | 'onClose' | 'wizardHeader'
> & {
  children: ReactNode
  onConfirm: () => void
  disabled: boolean
  isConfirming?: boolean
  showConfirm?: boolean
}) {
  const { t } = useLanguage()
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isConfirming) onClose()
      }}
    >
      <DialogContent
        size='4xl'
        className='flex max-h-[85dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0'
        closeButtonClassName='flex size-7 items-center justify-center rounded-full'
      >
        {wizardHeader}
        <DialogHeader className='shrink-0 px-5 pt-5 text-start'>
          <DialogTitle>{step.title}</DialogTitle>
          <DialogDescription className='leading-relaxed'>
            {step.action}
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 space-y-4 overflow-y-auto p-5'>{children}</div>
        <DialogFooter className='shrink-0 border-t p-4'>
          <Button
            variant='outline'
            className='rounded-full border-dashed px-6 shadow-none'
            disabled={isConfirming}
            onClick={onClose}
          >
            {t('engineering.productCreationGuide.close')}
          </Button>
          {showConfirm && (
            <Button
              className='rounded-full px-6'
              disabled={disabled || isConfirming}
              onClick={onConfirm}
            >
              {isConfirming && (
                <RefreshCw aria-hidden='true' className='size-4 animate-spin' />
              )}
              {t('engineering.productCreationGuide.confirmAndContinue')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProductCreationGuideConfigurationRequestState({
  isLoading,
  error,
  onRetry,
}: {
  isLoading: boolean
  error: unknown
  onRetry: () => void
}) {
  const { t } = useLanguage()
  if (error)
    return (
      <div
        role='alert'
        className='space-y-2 rounded-lg bg-destructive/5 p-3 text-sm'
      >
        <p>{t('engineering.productCreationGuide.loadFailed')}</p>
        <Button
          size='sm'
          variant='outline'
          className='rounded-full'
          onClick={onRetry}
        >
          {t('engineering.productCreationGuide.retry')}
        </Button>
      </div>
    )
  if (isLoading)
    return (
      <p role='status' className='text-sm text-muted-foreground'>
        {t('engineering.productCreationGuide.loading')}
      </p>
    )
  return null
}

function ProductCreationGuideTemplateSelectionDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t, locale } = useLanguage()
  const {
    categories,
    options,
    hasLoadedCatalog,
    isLoading: isAttributeCatalogLoading,
    error: attributeCatalogError,
    retry: retryAttributeCatalog,
  } = useProductAttributeCatalogQueries()
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    props.progress.completedSteps.template?.id ?? ''
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates({ fresh: true }),
  })
  const templates = (templatesQuery.data ?? []).filter(
    (template) => template.active
  )
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  )
  useProductCreationGuideSubmissionLock(isConfirming, props.onBusyChange)

  function completeSelectedProductCreationTemplate(template: ProductTemplate) {
    if (!template.active) {
      toast.error(t('engineering.productCreationGuide.loadFailed'))
      return
    }
    props.onCompleted({
      id: template.id,
      label: template.name,
      version: template.version,
      attributeCategoryKeys: template.attributeBindings
        .filter((binding) => binding.active)
        .map((binding) => binding.categoryKey),
    })
  }

  async function confirmExistingProductCreationTemplate() {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      const freshTemplate = (
        await productTemplateService.getTemplates({ fresh: true })
      ).find((template) => template.id === selectedTemplateId)
      if (!freshTemplate)
        throw new Error(t('engineering.productCreationGuide.loadFailed'))
      completeSelectedProductCreationTemplate(freshTemplate)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('engineering.productCreationGuide.loadFailed')
      )
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <ProductCreationGuideConfigurationDialog
      {...props}
      disabled={
        !selectedTemplate ||
        !templatesQuery.isSuccess ||
        Boolean(templatesQuery.error)
      }
      isConfirming={isConfirming}
      onConfirm={() => void confirmExistingProductCreationTemplate()}
    >
      <ProductCreationGuideConfigurationRequestState
        isLoading={templatesQuery.isPending}
        error={templatesQuery.error}
        onRetry={() => void templatesQuery.refetch()}
      />
      <div className='space-y-2'>
        <Label htmlFor='product-creation-guide-template-selection'>
          {t('engineering.productCreationGuide.selectTemplate')}
        </Label>
        <Select
          value={selectedTemplateId}
          onValueChange={setSelectedTemplateId}
        >
          <SelectTrigger
            id='product-creation-guide-template-selection'
            className='w-full'
          >
            <SelectValue
              placeholder={t(
                'engineering.productCreationGuide.selectPlaceholder'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedTemplate && (
        <div className='space-y-3 rounded-xl border p-4'>
          <p className='text-xs font-medium text-muted-foreground'>
            {t('engineering.productCreationGuide.templateIncludesAttributes')}
          </p>
          <ProductCreationGuideConfigurationRequestState
            isLoading={isAttributeCatalogLoading}
            error={attributeCatalogError}
            onRetry={() => void retryAttributeCatalog()}
          />
          <ul className='space-y-3'>
            {selectedTemplate.attributeBindings
              .filter((binding) => binding.active)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((binding) => {
                const category = categories.find((category) =>
                  areSameProductAttributeCategoryKey(
                    category.key,
                    binding.categoryKey
                  )
                )
                const activeOptions = options
                  .filter(
                    (option) =>
                      option.active &&
                      areSameProductAttributeCategoryKey(
                        option.categoryKey,
                        binding.categoryKey
                      )
                  )
                  .sort((left, right) => left.sortOrder - right.sortOrder)
                return (
                  <li
                    key={binding.categoryKey}
                    className='space-y-2 rounded-lg bg-muted/40 p-3'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='flex min-w-0 items-center gap-1.5 text-sm font-medium'>
                        <Check
                          aria-hidden='true'
                          className='size-3.5 shrink-0 text-primary'
                        />
                        <span className='break-words'>
                          {getProductTemplateAttributeLevelOneCategoryName(
                            locale,
                            category
                          ) ||
                            t(
                              'engineering.productCreationGuide.attributeCategory'
                            )}
                        </span>
                      </h3>
                      <span className='rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground'>
                        {t(
                          binding.required
                            ? 'engineering.productCreationGuide.requiredAttribute'
                            : 'engineering.productCreationGuide.optionalAttribute'
                        )}
                      </span>
                      {hasLoadedCatalog && !attributeCatalogError && (
                        <span className='text-xs text-muted-foreground sm:ml-auto'>
                          {t('engineering.productCreationGuide.optionCount', {
                            count: activeOptions.length,
                          })}
                        </span>
                      )}
                    </div>
                    {category?.description && (
                      <p className='text-xs leading-relaxed break-words text-muted-foreground'>
                        {category.description}
                      </p>
                    )}
                    {hasLoadedCatalog &&
                      !attributeCatalogError &&
                      (activeOptions.length > 0 ? (
                        <ul
                          aria-label={t(
                            'engineering.templateMgmt.assembly.levelTwoOptions'
                          )}
                          className='grid gap-2 sm:grid-cols-2'
                        >
                          {activeOptions.map((option) => (
                            <li
                              key={option.id}
                              className='min-w-0 rounded-md border bg-background px-3 py-2 text-xs'
                            >
                              <p className='font-medium break-words'>
                                {getProductTemplateAttributeLevelTwoOptionLabel(
                                  locale,
                                  option
                                )}
                              </p>
                              {option.description && (
                                <p className='mt-1 leading-relaxed break-words text-muted-foreground'>
                                  {option.description}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className='text-xs text-muted-foreground'>
                          {t(
                            'engineering.productCreationGuide.noActiveAttributeOptions'
                          )}
                        </p>
                      ))}
                  </li>
                )
              })}
          </ul>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {t('engineering.productCreationGuide.templateReuseHint')}
          </p>
        </div>
      )}
      {templatesQuery.isSuccess && !templates.length && (
        <p className='text-sm text-muted-foreground'>
          {t('engineering.productCreationGuide.noTemplatesAvailable')}
        </p>
      )}
      {props.progress.completedSteps.baseModel && (
        <p className='text-xs text-muted-foreground'>
          {t('engineering.productCreationGuide.upstreamChangeHint')}
        </p>
      )}
    </ProductCreationGuideConfigurationDialog>
  )
}

function ProductCreationGuideBaseModelSelectionDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t } = useLanguage()
  const [selectedBaseModelId, setSelectedBaseModelId] = useState(
    props.progress.completedSteps.baseModel?.id ?? ''
  )
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const typesQuery = useQuery({
    queryKey: [...PRODUCT_TYPES_QUERY_KEY, 'options'],
    queryFn: () => ProductTypeService.getProductTypes({ isOptions: true }),
  })
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates({ fresh: true }),
  })
  const { saveProductType, isSavingProductType } = useProductTypeWriteActions()
  const types = typesQuery.data ?? []
  const hierarchy = buildProductTypeHierarchyMetaMap(types)
  const baseModels = types.filter(
    (type) =>
      type.active &&
      hierarchy.get(type.id)?.level === 2 &&
      resolveEffectiveTemplate(templatesQuery.data ?? [], {
        productTypes: types,
        typeId: type.id,
      }).template?.id === props.progress.completedSteps.template?.id
  )
  useProductCreationGuideSubmissionLock(
    isConfirming || isSavingProductType,
    props.onBusyChange
  )

  async function confirmProductCreationBaseModel(
    type: ProductType,
    availableTypes = types
  ) {
    const resolution = await ProductTypeService.getTemplateResolution(type.id)
    if (
      resolution.templateResolutionError ||
      resolution.resolvedTemplateId !==
        props.progress.completedSteps.template?.id
    ) {
      toast.error(t('engineering.productCreationGuide.baseModelMismatch'))
      return
    }
    props.onCompleted({
      id: type.id,
      label:
        buildProductTypeHierarchyMetaMap(availableTypes).get(type.id)
          ?.pathLabel ?? type.name,
    })
  }
  async function confirmExistingProductCreationBaseModel() {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      const freshTypes = await ProductTypeService.getProductTypes({
        isOptions: true,
      })
      const candidate = freshTypes.find(
        (type) => type.id === selectedBaseModelId && type.active
      )
      if (
        !candidate ||
        buildProductTypeHierarchyMetaMap(freshTypes).get(candidate.id)
          ?.level !== 2
      )
        throw new Error(t('engineering.productCreationGuide.loadFailed'))
      await confirmProductCreationBaseModel(candidate, freshTypes)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('engineering.productCreationGuide.loadFailed')
      )
    } finally {
      setIsConfirming(false)
    }
  }
  async function saveProductCreationGuideCategoryOrBaseModel(
    formData: SaveProductTypeInput
  ) {
    setIsConfirming(true)
    try {
      const savedType = await saveProductType({ formData })
      setIsEditorOpen(false)
      setSelectedBaseModelId(savedType.id)
      const updatedTypes = [
        ...types.filter((type) => type.id !== savedType.id),
        savedType,
      ]
      if (
        buildProductTypeHierarchyMetaMap(updatedTypes).get(savedType.id)
          ?.level === 2
      )
        await confirmProductCreationBaseModel(savedType, updatedTypes)
    } catch (error) {
      toast.error(
        t('engineering.productCreationGuide.saveFailed', {
          message: error instanceof Error ? error.message : '',
        })
      )
    } finally {
      setIsConfirming(false)
    }
  }
  if (isEditorOpen)
    return (
      <ProductTypeActionDialog
        open
        wizardHeader={props.wizardHeader}
        initialTemplateId={props.progress.completedSteps.template?.id}
        onOpenChange={(open) => {
          if (!open && !isSavingProductType) setIsEditorOpen(false)
        }}
        onSubmit={saveProductCreationGuideCategoryOrBaseModel}
      />
    )
  return (
    <ProductCreationGuideConfigurationDialog
      {...props}
      disabled={
        !baseModels.some((type) => type.id === selectedBaseModelId) ||
        Boolean(typesQuery.error || templatesQuery.error)
      }
      isConfirming={isConfirming}
      onConfirm={() => void confirmExistingProductCreationBaseModel()}
    >
      <ProductCreationGuideConfigurationRequestState
        isLoading={typesQuery.isPending || templatesQuery.isPending}
        error={typesQuery.error || templatesQuery.error}
        onRetry={() => {
          void typesQuery.refetch()
          void templatesQuery.refetch()
        }}
      />
      <div className='space-y-2'>
        <Label htmlFor='product-creation-guide-base-model-selection'>
          {t('engineering.productCreationGuide.selectBaseModel')}
        </Label>
        <Select
          value={selectedBaseModelId}
          onValueChange={setSelectedBaseModelId}
        >
          <SelectTrigger
            id='product-creation-guide-base-model-selection'
            className='w-full'
          >
            <SelectValue
              placeholder={t(
                'engineering.productCreationGuide.selectPlaceholder'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {baseModels.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {hierarchy.get(type.id)?.pathLabel ?? type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className='rounded-lg bg-muted/50 p-3 text-xs'>
        {t('engineering.productCreationGuide.selectTemplate')}：
        {props.progress.completedSteps.template?.label}
      </p>
      {typesQuery.isSuccess && !baseModels.length && (
        <p className='text-sm text-muted-foreground'>
          {t('engineering.productCreationGuide.emptyOptions')}
        </p>
      )}
      {props.progress.completedSteps.product && (
        <p className='text-xs text-muted-foreground'>
          {t('engineering.productCreationGuide.upstreamChangeHint')}
        </p>
      )}
      <Button
        variant='outline'
        className='h-auto min-h-9 max-w-full rounded-full py-2 whitespace-normal'
        onClick={() => setIsEditorOpen(true)}
      >
        <Plus aria-hidden='true' className='size-4' />
        {t('engineering.productCreationGuide.createBaseModel')}
      </Button>
      <p className='text-xs leading-relaxed text-muted-foreground'>
        {t('engineering.productCreationGuide.baseModelCreateHelp')}
      </p>
    </ProductCreationGuideConfigurationDialog>
  )
}

function ProductCreationGuideProductGenerationDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t } = useLanguage()
  const hasSavedProductRef = useRef(false)
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false)
  const typesQuery = useQuery({
    queryKey: [...PRODUCT_TYPES_QUERY_KEY, 'options'],
    queryFn: () => ProductTypeService.getProductTypes({ isOptions: true }),
  })
  const savedProductId = props.progress.completedSteps.product?.id
  const productQuery = useQuery({
    queryKey: productDetailQueryKey(savedProductId ?? ''),
    queryFn: () => ProductCoreService.getProductById(savedProductId!),
    enabled: Boolean(savedProductId),
  })
  const { saveProducts, isSavingProducts } = useProductWriteActions()
  useProductCreationGuideSubmissionLock(
    isSubmittingProduct || isSavingProducts,
    props.onBusyChange
  )
  const selectedBaseModelId = props.progress.completedSteps.baseModel?.id ?? ''
  const types = typesQuery.data ?? []
  const selectedPathIds =
    buildProductTypeHierarchyMetaMap(types).get(selectedBaseModelId)?.pathIds ??
    []
  const selectedTypes = types.filter((type) =>
    selectedPathIds.includes(type.id)
  )
  async function saveProductFromCreationGuide(payload: ProductSubmitPayload) {
    if (isSubmittingProduct) return null
    setIsSubmittingProduct(true)
    try {
      if (
        payload.products.some(
          (product) => product.typeId !== selectedBaseModelId
        )
      )
        throw new Error(
          t('engineering.productCreationGuide.productBaseModelMismatch')
        )
      const resolution =
        await ProductTypeService.getTemplateResolution(selectedBaseModelId)
      if (
        resolution.templateResolutionError ||
        resolution.resolvedTemplateId !==
          props.progress.completedSteps.template?.id
      )
        throw new Error(t('engineering.productCreationGuide.baseModelMismatch'))
      return await saveProducts(
        payload.products.map((product) => ({
          data: product,
          currentRow: payload.currentRow,
        }))
      )
    } catch (error) {
      logger.error('Could not save product from creation guide', error)
      toast.error(
        t('engineering.productCreationGuide.saveFailed', {
          message: error instanceof Error ? error.message : '',
        })
      )
      return null
    } finally {
      setIsSubmittingProduct(false)
    }
  }
  const isProductLoading = Boolean(savedProductId && productQuery.isPending)
  const loadError =
    typesQuery.error ?? (savedProductId ? productQuery.error : null)
  if (
    !typesQuery.isSuccess ||
    !selectedTypes.length ||
    isProductLoading ||
    loadError
  )
    return (
      <ProductCreationGuideConfigurationDialog
        {...props}
        disabled
        showConfirm={false}
        onConfirm={() => undefined}
      >
        <ProductCreationGuideConfigurationRequestState
          isLoading={typesQuery.isPending || isProductLoading}
          error={
            loadError ??
            (typesQuery.isSuccess && !selectedTypes.length
              ? new Error('Base model unavailable')
              : null)
          }
          onRetry={() => {
            void typesQuery.refetch()
            if (savedProductId) void productQuery.refetch()
          }}
        />
      </ProductCreationGuideConfigurationDialog>
    )
  return (
    <ProductActionDialog
      open
      wizardHeader={props.wizardHeader}
      currentRow={productQuery.data}
      initialTypeId={selectedBaseModelId}
      productTypes={selectedTypes}
      onOpenChange={(open) => {
        if (!open && !hasSavedProductRef.current) props.onClose()
      }}
      onSubmit={saveProductFromCreationGuide}
      onSaved={(products) => {
        const product = products[0]
        if (product) {
          hasSavedProductRef.current = true
          props.onCompleted({
            id: product.id,
            label: product.name,
            code: product.sku,
          })
        }
      }}
    />
  )
}

function ProductCreationGuideBomCreationDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t } = useLanguage()
  const hasSavedBomRef = useRef(false)
  const { saveBOM, isSavingBOM } = useBOMWriteActions()
  const productId = props.progress.completedSteps.product?.id
  useProductCreationGuideSubmissionLock(isSavingBOM, props.onBusyChange)
  async function saveProductCreationGuideBom(data: SaveBOMInput) {
    if (!productId || data.productId !== productId) {
      toast.error(t('engineering.productCreationGuide.bomProductMismatch'))
      return null
    }
    try {
      const savedBom = await saveBOM({ data })
      hasSavedBomRef.current = true
      props.onCompleted({
        id: savedBom.id,
        label:
          [savedBom.bomNo, savedBom.bomVersion].filter(Boolean).join(' / ') ||
          savedBom.id,
      })
      return savedBom
    } catch (error) {
      logger.error('Could not save BOM from product creation guide', error)
      return null
    }
  }
  return (
    <BOMActionDialog
      open
      wizardHeader={props.wizardHeader}
      initialProductId={productId}
      onOpenChange={(open) => {
        if (!open && !hasSavedBomRef.current) props.onClose()
      }}
      onSubmit={saveProductCreationGuideBom}
    />
  )
}
