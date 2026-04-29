import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { type ProductAttributeOption } from '../data/schema'
import { AssetService } from '@/features/equipment-tooling/services/asset-service'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '@/features/engineering-db/query-keys'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import {
    ENGINEERING_PRODUCT_FORM_MOLD_GROUPS_QUERY_KEY,
    PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
} from '../query-keys'
import { PRODUCT_ATTRIBUTE_CATEGORY_KEYS } from '../utils/product-attribute-utils'
import { normalizeProductAttributeMachineValue } from '../utils/product-attribute-machine-value'
import { useLanguage } from '@/context/language-provider'
import { isNotFoundError } from '@/lib/error-status'

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
    const normalizedCategoryKey = normalizeProductAttributeMachineValue(categoryKey)
    if (!normalizedCategoryKey) return []

    return items
        .filter((item) => normalizeProductAttributeMachineValue(item.categoryKey) === normalizedCategoryKey && item.active)
        .map((item) => ({
            value: item.value,
            label: toLocalizedOptionLabel(locale, item),
        }))
}

interface UseProductFormInitParams {
    open: boolean
}

export function useProductFormInit({
    open,
}: UseProductFormInitParams) {
    const { locale, t } = useLanguage()
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

    if (categoriesQuery.isSuccess && !categoriesQuery.data) throw new Error('[CRITICAL] Categories Data missing')
    if (optionsQuery.isSuccess && !optionsQuery.data) throw new Error('[CRITICAL] Options Data missing')
    if (moldGroupsQuery.isSuccess && !moldGroupsQuery.data) throw new Error('[CRITICAL] Mold Groups Data missing')
    if (specsQuery.isSuccess && !specsQuery.data) throw new Error('[CRITICAL] Specs Data missing')

    const attributeCategories = categoriesQuery.data
    const attributeOptions = optionsQuery.data

    const versionLevelOptions = useMemo(
        () => {
            if (!attributeOptions) return []
            return toOptionItems(locale, attributeOptions, PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)
        },
        [attributeOptions, locale]
    )
    const moldOptions = useMemo(
        () => {
            if (!moldGroupsQuery.data) return []
            return moldGroupsQuery.data.map(group => ({ label: group, value: group }))
        },
        [moldGroupsQuery.data]
    )
    const specOptions = useMemo(
        () => {
            if (!specsQuery.data) return []
            return specsQuery.data.map(spec => ({ label: `${spec.name} (${spec.version})`, value: spec.id }))
        },
        [specsQuery.data]
    )
    const metadataInitError = useMemo(() => {
        const error = categoriesQuery.error ?? optionsQuery.error ?? moldGroupsQuery.error ?? specsQuery.error
        if (!error) {
            return null
        }

        return isNotFoundError(error)
            ? t('engineering.productMgmt.metadata.unavailable')
            : error instanceof Error
                ? error.message
                : t('engineering.productMgmt.metadata.initFailed')
    }, [categoriesQuery.error, moldGroupsQuery.error, optionsQuery.error, specsQuery.error, t])

    const metadataReady = open && !metadataInitError && categoriesQuery.isSuccess && optionsQuery.isSuccess && moldGroupsQuery.isSuccess && specsQuery.isSuccess

    return {
        attributeCategories,
        attributeOptions,
        versionLevelOptions,
        moldOptions,
        specOptions,
        metadataInitError,
        metadataReady,
    }
}
