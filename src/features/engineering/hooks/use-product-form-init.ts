import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type Product, type ProductAttributeCategory, type ProductAttributeOption, type ProductType, type ProductTypeAttributeBinding } from '../data/schema'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { buildDefaultProductValues, type ProductVariantSelection } from '../utils/product-form-utils'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { ProductTypeAttributeBindingService } from '../services/product-type-attribute-binding-service'
import { getAttributeValue, PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { useLanguage } from '@/context/language-provider'
import { isNotFoundError } from '@/lib/error-status'
import { createLogger } from '@/lib/logger'

type OptionItem = { label: string; value: string }
const logger = createLogger('useProductFormInit')

function toLocalizedOptionLabel(
    locale: string,
    item: { labelZh: string; labelEn?: string }
): string {
    if (locale === 'en-US') {
        return item.labelEn?.trim() || item.labelZh
    }

    return item.labelZh
}

function toOptionItems(locale: string, items: ProductAttributeOption[], categoryKey: string): OptionItem[] {
    return items
        .filter((item) => item.categoryKey === categoryKey && item.active)
        .map((item) => ({
            value: item.value,
            label: toLocalizedOptionLabel(locale, item),
        }))
}

interface UseProductFormInitParams {
    open: boolean
    isEdit: boolean
    currentRow?: Product
    productTypes: ProductType[]
    form: UseFormReturn<Product>
    selectedVariants: ProductVariantSelection[]
    setSelectedVariants: Dispatch<SetStateAction<ProductVariantSelection[]>>
}

const PRODUCT_METADATA_UNAVAILABLE_MESSAGE =
    'Product attribute metadata endpoints are unavailable on the current backend instance. Restart the local backend with the latest server code before creating or editing products.'

export function useProductFormInit({
    open,
    isEdit,
    currentRow,
    productTypes,
    form,
    selectedVariants,
    setSelectedVariants
}: UseProductFormInitParams) {
    const { locale } = useLanguage()
    const watchedTypeId = form.watch('typeId')
    const [attributeCategories, setAttributeCategories] = useState<ProductAttributeCategory[]>([])
    const [attributeOptions, setAttributeOptions] = useState<ProductAttributeOption[]>([])
    const [attributeBindings, setAttributeBindings] = useState<ProductTypeAttributeBinding[]>([])
    const [versionLevelOptions, setVersionLevelOptions] = useState<OptionItem[]>([])
    const [moldOptions, setMoldOptions] = useState<OptionItem[]>([])
    const [specOptions, setSpecOptions] = useState<OptionItem[]>([])
    const [metadataInitError, setMetadataInitError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        const resolveOptionalArray = async <T,>(promise: Promise<T[]>, resourceName: string): Promise<T[]> => {
            try {
                return await promise
            } catch (error) {
                if (isNotFoundError(error)) {
                    if (!cancelled) {
                        setMetadataInitError(PRODUCT_METADATA_UNAVAILABLE_MESSAGE)
                    }
                    logger.warn(`${resourceName} endpoint is unavailable; falling back to an empty list`, {
                        resourceName,
                    })
                    return []
                }

                throw error
            }
        }

        const loadDictData = async () => {
            if (!open) return
            setMetadataInitError(null)

            try {
                const [nextCategories, nextOptions, nextBindings] = await Promise.all([
                    resolveOptionalArray(
                        ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
                        'product attribute categories'
                    ),
                    resolveOptionalArray(
                        ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
                        'product attribute options'
                    ),
                    watchedTypeId
                        ? resolveOptionalArray(
                            ProductTypeAttributeBindingService.getProductTypeAttributeBindings({ productTypeId: watchedTypeId, activeOnly: true }),
                            'product type attribute bindings'
                        )
                        : Promise.resolve([]),
                ])

                if (cancelled) return

                setAttributeCategories(nextCategories)
                setAttributeOptions(nextOptions)
                setAttributeBindings(nextBindings)

                const resolvedVersionLevelOptions = toOptionItems(locale, nextOptions, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)
                setVersionLevelOptions(resolvedVersionLevelOptions)

                const [groups, specs] = await Promise.all([
                    AssetService.getGroupNames(),
                    SpecsService.getSpecs(),
                ])

                if (cancelled) return

                setMoldOptions(groups.map(group => ({ label: group, value: group })))
                setSpecOptions(specs.map(spec => ({ label: `${spec.name} (${spec.version})`, value: spec.id })))

                const weights = resolvedVersionLevelOptions
                if (!isEdit && selectedVariants.length === 0 && weights.length > 0) {
                    const currentWeight = form.getValues('weight')
                    setSelectedVariants([{ level: weights[0].value, weight: currentWeight }])
                }
            } catch (error) {
                if (cancelled) return

                setMetadataInitError(
                    error instanceof Error ? error.message : 'Failed to initialize product form metadata.'
                )
                logger.error('Failed to initialize product form dictionaries', error)
            }
        }

        void loadDictData()

        return () => {
            cancelled = true
        }
    }, [open, isEdit, form, locale, selectedVariants.length, setSelectedVariants, watchedTypeId])

    useEffect(() => {
        const initForm = async () => {
            if (open && isEdit && currentRow) {
                const draftRow: Product & { techSpecId?: string } = { ...currentRow }
                if (!draftRow.engineeringSpecId && draftRow.techSpecId) {
                    draftRow.engineeringSpecId = draftRow.techSpecId
                }
                form.reset(draftRow)
                const versionLevel = getAttributeValue(draftRow, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)
                if (versionLevel) {
                    setSelectedVariants([{ level: versionLevel, weight: draftRow.weight || 0 }])
                }
            } else if (open) {
                const defaultValues = buildDefaultProductValues({ includeVersion: false })
                form.reset(defaultValues)
            }
        }
        initForm()
    }, [open, isEdit, currentRow, productTypes, form, setSelectedVariants])

    useEffect(() => {
        if (!open) {
            setSelectedVariants([])
        }
    }, [open, setSelectedVariants])

    return {
        attributeCategories,
        attributeOptions,
        attributeBindings,
        versionLevelOptions,
        moldOptions,
        specOptions,
        metadataInitError,
    }
}
