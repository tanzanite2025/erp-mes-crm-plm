import { type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { type Product, type ProductType } from '../data/schema'
import { ProductCommand } from '../commands/product-command'
import { type ProductSubmitPayload } from './use-product-form'

interface UseProductFormSubmitParams {
  currentRow?: Product
  isEdit: boolean
  form: UseFormReturn<Product>
  productTypes: ProductType[]
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
  onOpenChange,
  onSubmit,
  onSaved,
}: UseProductFormSubmitParams) {
  const { t } = useLanguage()

  const handleFormSubmit = async (values: Product) => {
    const selectedType = productTypes.find((type) => type.id === values.typeId)
    const typeCode = selectedType?.code || 'X'
    const submitPayload = ProductCommand.composeSubmitPayload({
      values,
      typeCode,
      isEdit,
    })

    if (submitPayload.productsToSave.length === 0) {
      const error = createEmptySubmitPayloadError('received empty productsToSave payload')
      failLoudly(error, 'ProductFormSubmit.handleFormSubmit')
      throw error
    }

    const [finalData] = submitPayload.productsToSave
    if (!finalData) {
      const error = createEmptySubmitPayloadError('resolved submit branch without a product item')
      failLoudly(error, 'ProductFormSubmit.handleFormSubmit')
      throw error
    }

    let savedProducts: Product[] | void = undefined
    if (onSubmit) {
      savedProducts = await onSubmit({
        products: [finalData],
        currentRow,
      })
    }

    toast.success(
      submitPayload.mode === 'edit'
        ? t('engineering.productArchive.toasts.updateSuccess')
        : t('engineering.productArchive.toasts.createSingleSuccess')
    )

    if (savedProducts && savedProducts.length > 0) {
      onSaved?.(savedProducts)
    }

    onOpenChange(false)
  }

  return {
    handleFormSubmit,
  }
}
