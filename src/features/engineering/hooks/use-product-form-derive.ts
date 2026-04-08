import { useEffect, useMemo } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { type Product, type ProductType } from '../data/schema'
import { ProductCoreService } from '../services/product-core-service'
import { getEffectiveTemplate } from '../components/specs'
import { deriveSku } from '../utils/product-form-utils'

interface UseProductFormDeriveParams {
    isEdit: boolean
    open: boolean
    form: UseFormReturn<Product>
    productTypes: ProductType[]
}

export function useProductFormDerive({
    isEdit,
    open,
    form,
    productTypes
}: UseProductFormDeriveParams) {
    const dynamicTypes = useMemo(() => (productTypes || []).filter((t: ProductType) => t.active), [productTypes])

    const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
    const watchedModelCode = useWatch({ control: form.control, name: 'modelCode' })
    const watchedTemplateKey = useWatch({ control: form.control, name: 'templateKey' })
    const allValues = useWatch({ control: form.control })

    useEffect(() => {
        if (isEdit || !watchedTypeId || !open) return
        const deriveNextCode = async () => {
            const allProducts = await ProductCoreService.getProducts() || []
            const sameTypeProducts = allProducts.filter(p => p.typeId === watchedTypeId)

            if (sameTypeProducts.length === 0) {
                form.setValue('modelCode', '01')
            } else {
                const codes = sameTypeProducts.map(p => parseInt(p.modelCode)).filter(n => !isNaN(n))
                const maxCode = codes.length > 0 ? Math.max(...codes) : 0
                const nextCode = (maxCode + 1).toString().padStart(2, '0')
                const currentVal = form.getValues('modelCode')
                if (!currentVal || currentVal === '01' || currentVal === '') {
                    form.setValue('modelCode', nextCode)
                }
            }
        }
        deriveNextCode()
    }, [watchedTypeId, isEdit, open, form])

    useEffect(() => {
        if (isEdit || !watchedTypeId) return
        const updateTemplate = async () => {
            const type = productTypes.find(t => t.id === watchedTypeId)
            if (type) {
                const tpl = await getEffectiveTemplate(type)
                if (tpl && tpl.componentKey !== watchedTemplateKey) {
                    form.setValue('templateKey', tpl.componentKey)
                }
            }
        }
        updateTemplate()
    }, [watchedTypeId, isEdit, productTypes, watchedTemplateKey, form])

    useEffect(() => {
        if (isEdit || !open) return
        const selectedType = productTypes.find(t => t.id === watchedTypeId)
        const typeCode = selectedType?.code || ''
        const generatedSku = deriveSku(typeCode, watchedModelCode || '01')
        if (generatedSku && !isEdit && generatedSku !== form.getValues('sku')) {
            form.setValue('sku', generatedSku, { shouldDirty: true })
        }
    }, [watchedTypeId, watchedModelCode, isEdit, open, productTypes, form])

    const specSummary = useMemo(() => {
        return ProductCoreService.formatDisplay(allValues as Product)
    }, [allValues])

    return {
        dynamicTypes,
        watchedTemplateKey,
        specSummary
    }
}
