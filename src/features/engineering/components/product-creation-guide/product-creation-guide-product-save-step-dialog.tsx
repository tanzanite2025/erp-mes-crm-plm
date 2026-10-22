import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { useLanguage } from '@/context/language-provider'
import { useProductCreationGuideSubmissionLock } from '../../hooks/use-product-creation-guide-submission-lock'
import type { ProductSubmitPayload } from '../../hooks/use-product-form'
import { useProductWriteActions } from '../../hooks/use-product-write-actions'
import {
  PRODUCT_TYPES_QUERY_KEY,
  productDetailQueryKey,
} from '../../query-keys'
import { ProductCoreService } from '../../services/product-core-service'
import { ProductTypeService } from '../../services/product-type-service'
import { buildProductTypeHierarchyMetaMap } from '../../utils/product-type-tree'
import { ProductActionDialog } from '../product-action-dialog'
import { ProductCreationGuideConfigurationDialog } from './product-creation-guide-configuration-dialog-shell'
import { ProductCreationGuideConfigurationRequestState } from './product-creation-guide-configuration-request-state'
import type { ProductCreationGuideOperationDialogProps } from './product-creation-guide-step-dialog-contracts'

const logger = createLogger('ProductCreationGuideBusinessOperationDialog')

export function ProductCreationGuideProductGenerationDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t } = useLanguage()
  const hasSavedProductRef = useRef(false)
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false)
  const typesQuery = useQuery({
    queryKey: [...PRODUCT_TYPES_QUERY_KEY, 'options'],
    queryFn: () => ProductTypeService.getProductTypes({ isOptions: true }),
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
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
          error={loadError}
          onRetry={() => {
            void typesQuery.refetch()
            if (savedProductId) void productQuery.refetch()
          }}
        />
        {typesQuery.isSuccess && !selectedTypes.length && (
          <p role='alert' className='text-sm leading-relaxed'>
            {t('engineering.productCreationGuide.productBaseModelUnavailable')}
          </p>
        )}
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
