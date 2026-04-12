import { type Dispatch, type SetStateAction } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { normalizeSku } from '@/lib/codecs/code-normalization'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductType } from '../data/schema'
import { ProductCoreService } from '../services/product-core-service'
import {
  buildBatchProducts,
  buildSingleVariantProduct,
  ensureSkuUnique,
  type ProductVariantSelection,
} from '../utils/product-form-utils'

interface UseProductFormSubmitParams {
  currentRow?: Product
  isEdit: boolean
  form: UseFormReturn<Product>
  productTypes: ProductType[]
  selectedVariants: ProductVariantSelection[]
  setSelectedVariants: Dispatch<SetStateAction<ProductVariantSelection[]>>
  onOpenChange: (open: boolean) => void
  onSubmit?: (data: Product | Product[]) => Promise<void> | void
}

export function useProductFormSubmit({
  currentRow,
  isEdit,
  form,
  productTypes,
  selectedVariants,
  setSelectedVariants,
  onOpenChange,
  onSubmit,
}: UseProductFormSubmitParams) {
  const { t } = useLanguage()

  const handleVariantToggle = (level: string, checked: boolean) => {
    if (checked) {
      const currentWeight = form.getValues('weight')
      setSelectedVariants((prev) => [...prev, { level, weight: currentWeight }])
      return
    }

    setSelectedVariants((prev) => prev.filter((variant) => variant.level !== level))
  }

  const updateVariantWeight = (level: string, weight: number | undefined) => {
    setSelectedVariants((prev) =>
      prev.map((variant) => (variant.level === level ? { ...variant, weight } : variant))
    )
  }

  const handleFormSubmit = async (values: Product) => {
    const selectedType = productTypes.find((type) => type.id === values.typeId)
    const allProducts = (await ProductCoreService.getProducts()) || []
    const existingSkuMap = new Map<string, string>()

    for (const product of allProducts) {
      if (currentRow && product.id === currentRow.id) continue
      if (product.sku) existingSkuMap.set(normalizeSku(product.sku), product.id)
    }

    const validateSkuUnique = (productsToSave: Product[]) => {
      const result = ensureSkuUnique(productsToSave, new Set(existingSkuMap.keys()))

      if (result.ok) return true

      if (result.reason === 'EMPTY') {
        toast.error(t('engineering.productArchive.toasts.skuRequired'))
        return false
      }

      if (result.reason === 'DUPLICATE_IN_BATCH') {
        toast.error(
          t('engineering.productArchive.toasts.skuDuplicateBatch', {
            sku: result.sku ?? '',
          })
        )
        return false
      }

      toast.error(
        t('engineering.productArchive.toasts.skuExists', {
          sku: result.sku ?? '',
        })
      )
      return false
    }

    if (selectedVariants.length > 1) {
      toast.loading(
        t('engineering.productArchive.toasts.batchSaving', {
          count: selectedVariants.length,
        }),
        { id: 'batch-save' }
      )

      const typeCode = selectedType?.code || 'X'

      try {
        const productsToSave = buildBatchProducts(values, selectedVariants, typeCode)

        if (!validateSkuUnique(productsToSave)) {
          toast.error(t('engineering.productArchive.toasts.batchSaveFailed'), {
            id: 'batch-save',
          })
          return
        }

        if (onSubmit) await onSubmit(productsToSave)

        toast.success(
          t('engineering.productArchive.toasts.batchSaveSuccess', {
            count: selectedVariants.length,
          }),
          { id: 'batch-save' }
        )
      } catch (error) {
        failLoudly(error, 'ProductFormSubmit.batchSave')
        toast.error(t('engineering.productArchive.toasts.batchSaveFailed'), {
          id: 'batch-save',
        })
        return
      }
    } else if (selectedVariants.length === 1) {
      const variant = selectedVariants[0]
      const finalData = buildSingleVariantProduct(
        values,
        variant,
        selectedType?.code || 'X'
      )

      if (!validateSkuUnique([finalData])) return
      if (onSubmit) await onSubmit(finalData)

      toast.success(
        isEdit
          ? t('engineering.productArchive.toasts.updateSuccess')
          : t('engineering.productArchive.toasts.createVariantSuccess')
      )
    } else {
      if (!validateSkuUnique([values])) return
      if (onSubmit) await onSubmit(values)

      toast.success(
        isEdit
          ? t('engineering.productArchive.toasts.updateSuccess')
          : t('engineering.productArchive.toasts.createSingleSuccess')
      )
    }

    onOpenChange(false)
    setSelectedVariants([])
  }

  return {
    handleVariantToggle,
    updateVariantWeight,
    handleFormSubmit,
  }
}
