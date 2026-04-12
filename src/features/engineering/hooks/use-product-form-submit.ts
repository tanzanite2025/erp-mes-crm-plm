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
  onSubmit?: (payload: ProductSubmitPayload) => Promise<void> | void
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
    const currentWeight = form.getValues('weight')
    setSelectedVariants((prev) =>
      ProductCommand.toggleVariantSelection({
        selectedVariants: prev,
        level,
        checked,
        defaultWeight: currentWeight,
      })
    )
  }

  const updateVariantWeight = (level: string, weight: number | undefined) => {
    setSelectedVariants((prev) =>
      ProductCommand.updateVariantSelectionWeight({
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

    if (submitPayload.mode === 'batch') {
      toast.loading(
        t('engineering.productArchive.toasts.batchSaving', {
          count: submitPayload.productsToSave.length,
        }),
        { id: 'batch-save' }
      )

      try {
        if (onSubmit) {
          await onSubmit({
            products: submitPayload.productsToSave,
          })
        }

        toast.success(
          t('engineering.productArchive.toasts.batchSaveSuccess', {
            count: submitPayload.productsToSave.length,
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
    } else if (submitPayload.mode === 'variant' || submitPayload.mode === 'edit') {
      const [finalData] = submitPayload.productsToSave

      if (!finalData) return
      if (onSubmit) {
        await onSubmit({
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

      if (!singleData) return
      if (onSubmit) {
        await onSubmit({
          products: [singleData],
          currentRow,
        })
      }

      toast.success(
        t('engineering.productArchive.toasts.createSingleSuccess')
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
