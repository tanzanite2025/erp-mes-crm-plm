import { useEffect, useMemo, useState } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { normalizeModelCode, normalizeSku } from '@/lib/codecs/code-normalization'
import { getServerErrorPresentation } from '@/lib/handle-server-error'
import { createLogger } from '@/lib/logger'
import { type Product, type ProductType } from '../data/schema'
import { ProductCoreService } from '../services/product-core-service'
import { deriveSku } from '../utils/product-form-utils'

const logger = createLogger('useProductFormDerive')

interface UseProductFormDeriveParams {
    isEdit: boolean
    open: boolean
    form: UseFormReturn<Product>
    productTypes: ProductType[]
}

interface UseProductFormDeriveResult {
    dynamicTypes: ProductType[]
    specPreviewSummary: string
    skuPreview: string
    nextCodeDeriveError: string | null
}

export function useProductFormDerive({
    isEdit,
    open,
    form,
    productTypes
}: UseProductFormDeriveParams): UseProductFormDeriveResult {
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
                    form.setValue('modelCode', normalizeModelCode(nextCode))
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
            return normalizeSku(form.getValues('sku'))
        }

        if (!open) return ''

        const selectedType = productTypes.find((type) => type.id === watchedTypeId)
        const typeCode = selectedType?.code || ''
        if (!typeCode) return ''

        // SKU preview is UI-only. The persisted SKU must be issued and normalized by the backend.
        return normalizeSku(deriveSku(typeCode, normalizeModelCode(watchedModelCode || '01')))
    }, [form, isEdit, open, productTypes, watchedModelCode, watchedTypeId])

    const specPreviewSummary = useMemo(() => {
        return ProductCoreService.formatDisplay(allValues as Product)
    }, [allValues])

    return {
        dynamicTypes,
        specPreviewSummary,
        skuPreview,
        nextCodeDeriveError
    }
}
