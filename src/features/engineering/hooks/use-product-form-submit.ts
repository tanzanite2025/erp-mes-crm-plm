import { type Dispatch, type SetStateAction } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductType } from '../data/schema'
import { type ProductVariantSelection } from '../utils/product-form-utils'
import { ProductCommand } from '../commands/product-command'
import { type ProductSubmitPayload } from './use-product-form'

interface UseProductFormSubmitParams {
  currentRow?: Product
  isEdit: boolean
  form: UseFormReturn<Product>
  productTypes: ProductType[]
  selectedVariants: ProductVariantSelection[]
  setSelectedVariants: Dispatch<SetStateAction<ProductVariantSelection[]>>
  onOpenChange: (open: boolean) => void
  onSubmit?: (payload: ProductSubmitPayload) => Promise<Product[] | void> | Product[] | void
  onSaved?: (products: Product[]) => void
}

function createEmptySubmitPayloadError(detail: string): Error {
  return new Error(`[CRITICAL] useProductFormSubmit.handleFormSubmit ${detail}`)
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
  onSaved,
}: UseProductFormSubmitParams) {
  const { t } = useLanguage()

  const handleVariantToggle = (level: string, checked: boolean) => {
    const currentWeight = form.getValues('weight')
    setSelectedVariants((prev) =>
      ProductCommand.selectVariant({
        selectedVariants: prev,
        level,
        checked,
        defaultWeight: currentWeight,
      })
    )
  }

  const updateVariantWeight = (level: string, weight: number | undefined) => {
    setSelectedVariants((prev) =>
      ProductCommand.setVariantWeight({
        selectedVariants: prev,
        level,
        weight,
      })
    )
  }

  const handleFormSubmit = async (values: Product) => {
    const selectedType = productTypes.find((type) => type.id === values.typeId)
    const typeCode = selectedType?.code || 'X'
    const submitPayload = ProductCommand.composeSubmitPayload({
      values,
      selectedVariants,
      typeCode,
      isEdit,
    })

    if (submitPayload.productsToSave.length === 0) {
      const error = createEmptySubmitPayloadError('received empty productsToSave payload')
      failLoudly(error, 'ProductFormSubmit.handleFormSubmit')
      throw error
    }

    let savedProducts: Product[] | void = undefined

    if (submitPayload.mode === 'multi-variant') {
      toast.error(t('engineering.productArchive.toasts.multiVariantSingleSubmitOnly'))
      return
    }

    if (submitPayload.mode === 'variant' || submitPayload.mode === 'edit') {
      const [finalData] = submitPayload.productsToSave

      if (!finalData) {
        const error = createEmptySubmitPayloadError('resolved variant/edit branch without a product item')
        failLoudly(error, 'ProductFormSubmit.variantOrEditSubmit')
        throw error
      }
      if (onSubmit) {
        savedProducts = await onSubmit({
          products: [finalData],
          currentRow,
        })
      }

      toast.success(
        submitPayload.mode === 'edit'
          ? t('engineering.productArchive.toasts.updateSuccess')
          : t('engineering.productArchive.toasts.createVariantSuccess')
      )
    } else {
      const [singleData] = submitPayload.productsToSave

      if (!singleData) {
        const error = createEmptySubmitPayloadError('resolved single branch without a product item')
        failLoudly(error, 'ProductFormSubmit.singleSubmit')
        throw error
      }
      if (onSubmit) {
        savedProducts = await onSubmit({
          products: [singleData],
          currentRow,
        })
      }

      toast.success(
        t('engineering.productArchive.toasts.createSingleSuccess')
      )
    }

    if (savedProducts && savedProducts.length > 0) {
      onSaved?.(savedProducts)
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
