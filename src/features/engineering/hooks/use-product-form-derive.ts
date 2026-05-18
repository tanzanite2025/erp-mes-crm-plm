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
import { deriveSku, resolveEffectiveProductName } from '../utils/product-form-utils'
import {
  normalizeProductModelCodeValue,
  normalizeProductSkuValue,
} from '../utils/product-code-normalization'
import {
  buildOrderedProductTypes,
  buildProductTypeHierarchyMetaMap,
} from '../utils/product-type-tree'

const logger = createLogger('useProductFormDerive')
const BASE_MODEL_LEVEL = 2

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

    const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
    const watchedModelCode = useWatch({ control: form.control, name: 'modelCode' })
    const allValues = useWatch({ control: form.control })
    const [nextCodeDeriveError, setNextCodeDeriveError] = useState<string | null>(null)
    const orderedTypes = useMemo(() => buildOrderedProductTypes(productTypes || [], true), [productTypes])
    const hierarchyMetaMap = useMemo(() => buildProductTypeHierarchyMetaMap(productTypes || [], true), [productTypes])
    const baseModelTypes = useMemo(
        () => orderedTypes.filter((type) => {
            if (!type.active) return false
            return (hierarchyMetaMap.get(type.id)?.level ?? -1) === BASE_MODEL_LEVEL
        }),
        [hierarchyMetaMap, orderedTypes]
    )
    const baseModelTypeIds = useMemo(
        () => new Set(baseModelTypes.map((type) => type.id)),
        [baseModelTypes]
    )
    const selectedType = useMemo(
        () => (productTypes || []).find((type) => type.id === watchedTypeId),
        [productTypes, watchedTypeId]
    )
    const dynamicTypes = useMemo(() => {
        return baseModelTypes
    }, [baseModelTypes])

    useEffect(() => {
        if (!open || !watchedTypeId) {
            return
        }

        if (baseModelTypeIds.has(watchedTypeId)) {
            return
        }

        form.clearErrors('typeId')
        form.setValue('typeId', '', { shouldDirty: false, shouldValidate: false })
        form.setValue('name', '', { shouldDirty: false, shouldValidate: false })
    }, [baseModelTypeIds, form, open, watchedTypeId])

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

    const previewProduct = useMemo(
        () => ({
            ...(allValues as Product),
            name: resolveEffectiveProductName({
                product: allValues as Product,
                productTypes,
                typeCode: selectedType?.code,
            }),
        }),
        [allValues, productTypes, selectedType?.code]
    )

    const specPreviewV2 = useMemo(
        () => resolveProductDisplayV2({
                locale,
                product: previewProduct,
                template: previewTemplate ?? undefined,
                categories: attributeCategories,
                options: attributeOptions,
            }),
        [attributeCategories, attributeOptions, locale, previewProduct, previewTemplate]
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
