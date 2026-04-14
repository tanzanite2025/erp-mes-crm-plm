import { type Dispatch, type SetStateAction, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type UseFormReturn } from 'react-hook-form'
import { type Product, type ProductAttributeOption, type ProductType } from '../data/schema'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '@/features/engineering-db/query-keys'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { type ProductVariantSelection } from '../utils/product-form-utils'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { ProductTypeAttributeBindingService } from '../services/product-type-attribute-binding-service'
import {
    ENGINEERING_PRODUCT_FORM_MOLD_GROUPS_QUERY_KEY,
    PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    productTypeAttributeBindingsQueryKey,
} from '../query-keys'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { useLanguage } from '@/context/language-provider'
import { isNotFoundError } from '@/lib/error-status'
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

export function useProductFormInit({
    open,
    isEdit,
    currentRow,
    productTypes,
    form,
    selectedVariants,
    setSelectedVariants
}: UseProductFormInitParams) {
    const { locale, t } = useLanguage()
    const watchedTypeId = form.watch('typeId')
    const categoriesQuery = useQuery({
        queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
        queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
        enabled: open,
    })

    const optionsQuery = useQuery({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
        queryFn: () => ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
        enabled: open,
    })

    const bindingsQuery = useQuery({
        queryKey: productTypeAttributeBindingsQueryKey(watchedTypeId || ''),
        queryFn: () => ProductTypeAttributeBindingService.getProductTypeAttributeBindings({ productTypeId: watchedTypeId || '', activeOnly: true }),
        enabled: open && !!watchedTypeId,
    })

    const moldGroupsQuery = useQuery({
        queryKey: ENGINEERING_PRODUCT_FORM_MOLD_GROUPS_QUERY_KEY,
        queryFn: () => AssetService.getGroupNames(),
        enabled: open,
    })

    const specsQuery = useQuery({
        queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
        queryFn: () => SpecsService.getSpecs(),
        enabled: open,
    })

    const attributeCategories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
    const attributeOptions = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])
    const attributeBindings = useMemo(
        () => (watchedTypeId ? bindingsQuery.data ?? [] : []),
        [bindingsQuery.data, watchedTypeId]
    )
    const versionLevelOptions = useMemo(
        () => toOptionItems(locale, attributeOptions, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version),
        [attributeOptions, locale]
    )
    const moldOptions = useMemo(
        () => (moldGroupsQuery.data ?? []).map(group => ({ label: group, value: group })),
        [moldGroupsQuery.data]
    )
    const specOptions = useMemo(
        () => (specsQuery.data ?? []).map(spec => ({ label: `${spec.name} (${spec.version})`, value: spec.id })),
        [specsQuery.data]
    )
    const metadataInitError = useMemo(() => {
        const error = categoriesQuery.error ?? optionsQuery.error ?? bindingsQuery.error ?? moldGroupsQuery.error ?? specsQuery.error
        if (!error) {
            return null
        }

        return isNotFoundError(error)
            ? t('engineering.productMgmt.metadata.unavailable')
            : error instanceof Error
                ? error.message
                : t('engineering.productMgmt.metadata.initFailed')
    }, [bindingsQuery.error, categoriesQuery.error, moldGroupsQuery.error, optionsQuery.error, specsQuery.error, t])

    const metadataReady = open && !metadataInitError && categoriesQuery.isSuccess && optionsQuery.isSuccess && moldGroupsQuery.isSuccess && specsQuery.isSuccess && (!watchedTypeId || bindingsQuery.isSuccess)

    useEffect(() => {
        if (!metadataReady) {
            return
        }

        if (!isEdit && selectedVariants.length === 0) {
            const initialState = ProductCommand.composeInitialState({
                isEdit,
                currentRow,
                versionLevelOptions,
                baseValues: form.getValues(),
            })
            setSelectedVariants(initialState.selectedVariants)
        }
    }, [currentRow, form, isEdit, metadataReady, selectedVariants.length, setSelectedVariants, versionLevelOptions])

    useEffect(() => {
        if (open && metadataReady) {
            const initialState = ProductCommand.composeInitialState({
                isEdit,
                currentRow,
                versionLevelOptions,
            })
            form.reset(initialState.formValues)
            setSelectedVariants(initialState.selectedVariants)
        }
    }, [open, isEdit, currentRow, productTypes, form, setSelectedVariants, versionLevelOptions, metadataReady])

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
