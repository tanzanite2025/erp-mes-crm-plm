import { type UseFormReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { ProductCommand } from '../commands/product-command'
import {
  type Product,
  type ProductTemplateAttributeLevelTwoOption,
  type ProductType,
} from '../data/schema'
import { resolveProductAggregateDisplayLabel } from '../utils/product-display-aggregate'
import { resolveEffectiveProductSku } from '../utils/product-form-utils'
import { type ProductSubmitPayload } from './use-product-form'

interface UseProductFormSubmitParams {
  currentRow?: Product
  isEdit: boolean
  form: UseFormReturn<Product>
  productTypes: ProductType[]
  attributeOptions?: ProductTemplateAttributeLevelTwoOption[]
  onOpenChange: (open: boolean) => void
  onSubmit?: (
    payload: ProductSubmitPayload
  ) => Promise<Product[] | void | null> | Product[] | void | null
  onSaved?: (products: Product[]) => void
}

function createEmptySubmitPayloadError(detail: string): Error {
  return new Error(`[CRITICAL] useProductFormSubmit.handleFormSubmit ${detail}`)
}

export function useProductFormSubmit({
  currentRow,
  isEdit,
  form: _form,
  productTypes,
  attributeOptions,
  onOpenChange,
  onSubmit,
  onSaved,
}: UseProductFormSubmitParams) {
  const { locale, t } = useLanguage()

  const handleFormSubmit = async (values: Product) => {
    const selectedType = productTypes.find((type) => type.id === values.typeId)
    const typeCode = selectedType?.code || 'X'
    const normalizedValues: Product = {
      ...values,
      name: resolveProductAggregateDisplayLabel({
        locale,
        product: values,
        productTypes,
        options: attributeOptions,
        ownerTypeInternalLabel: t(
          'engineering.bomArchive.form.ownerTypeInternal'
        ),
        unknownCustomerLabel: t('engineering.bomArchive.table.ownerUnknown'),
        emptyBaseLabel: t('engineering.productArchive.states.unnamed'),
      }),
      sku: resolveEffectiveProductSku({
        product: values,
        productTypes,
        typeCode,
      }),
    }
    const submitPayload = ProductCommand.composeSubmitPayload({
      values: normalizedValues,
      typeCode,
      isEdit,
    })

    if (submitPayload.productsToSave.length === 0) {
      const error = createEmptySubmitPayloadError(
        'received empty productsToSave payload'
      )
      failLoudly(error, 'ProductFormSubmit.handleFormSubmit')
      throw error
    }

    const [finalData] = submitPayload.productsToSave
    if (!finalData) {
      const error = createEmptySubmitPayloadError(
        'resolved submit branch without a product item'
      )
      failLoudly(error, 'ProductFormSubmit.handleFormSubmit')
      throw error
    }

    let savedProducts: Product[] | void | null = undefined
    if (onSubmit) {
      savedProducts = await onSubmit({
        products: [finalData],
        currentRow,
      })
    }

    if (savedProducts === null) return

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
