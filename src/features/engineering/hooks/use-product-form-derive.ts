import { useEffect, useMemo, useState } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { getServerErrorPresentation } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import {
  type Product,
  type ProductAttributeCategory,
  type ProductAttributeOption,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import {
  resolveProductDisplayV2,
  type ProductDisplayProjectionV2,
} from '../display/product-display-v2'
import { ProductCoreService } from '../services/product-core-service'
import { deriveSku } from '../utils/product-form-utils'
import {
  normalizeProductModelCodeValue,
  normalizeProductSkuValue,
} from '../utils/product-code-normalization'

const logger = createLogger('useProductFormDerive')

interface UseProductFormDeriveParams {
    isEdit: boolean
    open: boolean
    form: UseFormReturn<Product>
    previewTemplate?: ProductTemplate | null
    attributeCategories?: ProductAttributeCategory[]
    attributeOptions?: ProductAttributeOption[]
    productTypes: ProductType[]
}

interface UseProductFormDeriveResult {
    dynamicTypes: ProductType[]
    specPreviewTitle: string
    specPreviewSummary: string
    specPreviewV2: ProductDisplayProjectionV2 | null
    skuPreview: string
    nextCodeDeriveError: string | null
}

export function useProductFormDerive({
    isEdit,
    open,
    form,
    previewTemplate,
    attributeCategories,
    attributeOptions,
    productTypes
}: UseProductFormDeriveParams): UseProductFormDeriveResult {
    const { locale } = useLanguage()
    const dynamicTypes = useMemo(() => (productTypes || []).filter((t: ProductType) => t.active), [productTypes])

    const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
    const watchedModelCode = useWatch({ control: form.control, name: 'modelCode' })
    const allValues = useWatch({ control: form.control })
    const [nextCodeDeriveError, setNextCodeDeriveError] = useState<string | null>(null)

    useEffect(() => {
        if (isEdit || !watchedTypeId || !open) return

        const deriveNextCode = async () => {
            try {
                const nextCode = await ProductCoreService.getNextCode(watchedTypeId)
                setNextCodeDeriveError(null)
                const currentVal = form.getValues('modelCode')
                if (!currentVal || currentVal === '01' || currentVal === '') {
                    form.setValue('modelCode', normalizeProductModelCodeValue(nextCode))
                }
            } catch (error) {
                logger.error('Failed to derive next product code from authority engine', error)
                setNextCodeDeriveError(getServerErrorPresentation(error).message)
            }
        }
        void deriveNextCode()
    }, [watchedTypeId, isEdit, open, form])

    const skuPreview = useMemo(() => {
        if (isEdit) {
            return normalizeProductSkuValue(form.getValues('sku'))
        }

        if (!open) return ''

        const selectedType = productTypes.find((type) => type.id === watchedTypeId)
        const typeCode = selectedType?.code || ''
        if (!typeCode) return ''

        // SKU preview is UI-only. The persisted SKU must be issued and normalized by the backend.
        return normalizeProductSkuValue(deriveSku(typeCode, normalizeProductModelCodeValue(watchedModelCode || '01')))
    }, [form, isEdit, open, productTypes, watchedModelCode, watchedTypeId])

    const specPreviewV2 = useMemo(
        () => resolveProductDisplayV2({
                locale,
                product: allValues as Product,
                template: previewTemplate ?? undefined,
                categories: attributeCategories,
                options: attributeOptions,
            }),
        [allValues, attributeCategories, attributeOptions, locale, previewTemplate]
    )

    const specPreviewTitle = specPreviewV2.title
    const specPreviewSummary = specPreviewV2.fullLabel

    return {
        dynamicTypes,
        specPreviewTitle,
        specPreviewSummary,
        specPreviewV2,
        skuPreview,
        nextCodeDeriveError
    }
}
