import { type Dispatch, type SetStateAction, useEffect, useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { type Product, type ProductAttributeCategory, type ProductAttributeOption, type ProductType, type ProductTypeAttributeBinding } from '../data/schema'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { type ProductVariantSelection } from '../utils/product-form-utils'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { ProductTypeAttributeBindingService } from '../services/product-type-attribute-binding-service'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { useLanguage } from '@/context/language-provider'
import { isNotFoundError } from '@/lib/error-status'
import { failLoudly } from '@/lib/safe-catch'
import { ProductCommand } from '../commands/product-command'

type OptionItem = { label: string; value: string }

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

        const loadDictData = async () => {
            if (!open) return
            setMetadataInitError(null)

            try {
                const [nextCategories, nextOptions, nextBindings] = await Promise.all([
                    ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
                    ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
                    watchedTypeId
                        ? ProductTypeAttributeBindingService.getProductTypeAttributeBindings({ productTypeId: watchedTypeId, activeOnly: true })
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

                if (!isEdit && selectedVariants.length === 0) {
                    const initialState = ProductCommand.composeInitialState({
                        isEdit,
                        currentRow,
                        versionLevelOptions: resolvedVersionLevelOptions,
                        baseValues: form.getValues(),
                    })
                    setSelectedVariants(initialState.selectedVariants)
                }
            } catch (error) {
                if (cancelled) return

                failLoudly(error, 'useProductFormInit.loadDictData')
                setMetadataInitError(
                    isNotFoundError(error)
                        ? PRODUCT_METADATA_UNAVAILABLE_MESSAGE
                        : error instanceof Error
                            ? error.message
                            : 'Failed to initialize product form metadata.'
                )
            }
        }

        void loadDictData()

        return () => {
            cancelled = true
        }
    }, [open, isEdit, currentRow, form, locale, selectedVariants.length, setSelectedVariants, watchedTypeId])

    useEffect(() => {
        const initForm = async () => {
            if (open) {
                const initialState = ProductCommand.composeInitialState({
                    isEdit,
                    currentRow,
                    versionLevelOptions,
                })
                form.reset(initialState.formValues)
                setSelectedVariants(initialState.selectedVariants)
            }
        }
        initForm()
    }, [open, isEdit, currentRow, productTypes, form, setSelectedVariants, versionLevelOptions])

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
