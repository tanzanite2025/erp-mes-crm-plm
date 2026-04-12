import { useEffect, useMemo } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { normalizeModelCode, normalizeSku } from '@/lib/codecs/code-normalization'
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

export function useProductFormDerive({
    isEdit,
    open,
    form,
    productTypes
}: UseProductFormDeriveParams) {
    const dynamicTypes = useMemo(() => (productTypes || []).filter((t: ProductType) => t.active), [productTypes])

    const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
    const watchedModelCode = useWatch({ control: form.control, name: 'modelCode' })
    const allValues = useWatch({ control: form.control })

    useEffect(() => {
        if (isEdit || !watchedTypeId || !open) return
        
        const deriveNextCode = async () => {
            try {
                // [BACKEND-AUTHORITY]: 权威发号必须由后端原子化完成，严禁前端拉取全量数据进行 O(N) 汇总计算。
                const nextCode = await ProductCoreService.getNextCode(watchedTypeId)
                const currentVal = form.getValues('modelCode')
                if (!currentVal || currentVal === '01' || currentVal === '') {
                    form.setValue('modelCode', normalizeModelCode(nextCode))
                }
            } catch (error) {
                logger.error('Failed to derive next product code from authority engine', error)
            }
        }
        deriveNextCode()
    }, [watchedTypeId, isEdit, open, form])

    useEffect(() => {
        if (isEdit || !open) return
        const selectedType = productTypes.find(t => t.id === watchedTypeId)
        const typeCode = selectedType?.code || ''
        // [UI-PREVIEW]: SKU 前端自动派生仅供交互参考
        // [BACKEND-AUTHORITY]: 物理 SKU 的最终合法性必须由后端在保存阶段进行冲突检查与确认。
        const generatedSku = deriveSku(typeCode, normalizeModelCode(watchedModelCode || '01'))
        if (generatedSku && !isEdit && generatedSku !== form.getValues('sku')) {
            form.setValue('sku', normalizeSku(generatedSku), { shouldDirty: true })
        }
    }, [watchedTypeId, watchedModelCode, isEdit, open, productTypes, form])

    const specSummary = useMemo(() => {
        return ProductCoreService.formatDisplay(allValues as Product)
    }, [allValues])

    return {
        dynamicTypes,
        specSummary
    }
}
