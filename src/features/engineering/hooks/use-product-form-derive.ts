import { useEffect, useMemo, useState } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { type BOM } from '@/features/product-structure/data/schema'
import { resolveBOMOwnerDisplay } from '@/features/product-structure/utils/bom-owner-display'
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
  type ProductDisplaySummaryItemV2,
  type ProductDisplayProjectionV2,
} from '../display/product-display-v2'
import { ProductCoreService } from '../services/product-core-service'
import { resolveEffectiveProductName, resolveEffectiveProductSku } from '../utils/product-form-utils'
import {
  normalizeProductModelCodeValue,
} from '../utils/product-code-normalization'
import {
  PRODUCT_ATTRIBUTE_CATEGORY_KEYS,
  getOptionLabel,
  upsertAttributeValue,
} from '../utils/product-attribute-utils'
import { normalizeProductAttributeMachineValue } from '../utils/product-attribute-machine-value'
import {
  formatBOMMeasuredWeight,
  resolveProductAggregateDisplay,
  resolveProductAggregateDisplayLabel,
} from '../utils/product-display-aggregate'
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
    boms?: BOM[]
    customerNameMap?: Map<string, string>
    productTypes: ProductType[]
}

interface SelectedBomContextDisplay {
    bomId: string
    bomNo: string
    hasSelection: boolean
    hint: string
    items: ProductDisplaySummaryItemV2[]
}

interface UseProductFormDeriveResult {
    dynamicTypes: ProductType[]
    specPreviewTitle: string
    specPreviewSummary: string
    specPreviewAggregateLabel: string
    specPreviewV2: ProductDisplayProjectionV2 | null
    specPreviewItems: ProductDisplaySummaryItemV2[]
    selectedBomContext: SelectedBomContextDisplay | null
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
    boms,
    customerNameMap,
    productTypes
}: UseProductFormDeriveParams): UseProductFormDeriveResult {
    const { locale, t } = useLanguage()

    const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
    const watchedBomId = useWatch({ control: form.control, name: 'bomId' })
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
    const selectedBom = useMemo(
        () => (boms || []).find((bom) => bom.id === watchedBomId) ?? null,
        [boms, watchedBomId]
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
        form.setValue('sku', '', { shouldDirty: false, shouldValidate: false })
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
        if (!open) return ''

        return resolveEffectiveProductSku({
            product: {
                modelCode: normalizeProductModelCodeValue(watchedModelCode || '01'),
                typeId: watchedTypeId || '',
            },
            productTypes,
            typeCode: selectedType?.code,
        })
    }, [open, productTypes, selectedType?.code, watchedModelCode, watchedTypeId])

    const selectedBomContext = useMemo<SelectedBomContextDisplay | null>(() => {
        if (!open) {
            return null
        }

        const isChineseLocale = locale.startsWith('zh')
        const unboundValue = isChineseLocale ? '未绑定' : 'Unbound'

        if (!selectedBom) {
            return {
                bomId: '',
                bomNo: '',
                hasSelection: false,
                hint: isChineseLocale ? '未选择 BOM，当前显示为调试占位状态' : 'No BOM selected, showing debug placeholders',
                items: [
                    {
                        key: 'bom-type',
                        label: isChineseLocale ? 'BOM类型' : 'BOM Type',
                        value: unboundValue,
                        empty: true,
                    },
                    {
                        key: 'bom-owner-type',
                        label: isChineseLocale ? '归属' : 'Owner',
                        value: unboundValue,
                        empty: true,
                    },
                    {
                        key: 'bom-owner-customer',
                        label: isChineseLocale ? '归属客户' : 'Owner Customer',
                        value: unboundValue,
                        empty: true,
                    },
                    {
                        key: 'bom-version-level',
                        label: isChineseLocale ? '产品档次' : 'Product Grade',
                        value: unboundValue,
                        empty: true,
                    },
                    {
                        key: 'bom-measured-weight',
                        label: isChineseLocale ? '成品重量' : 'Finished Weight',
                        value: unboundValue,
                        empty: true,
                    },
                ],
            }
        }

        const bomTypeCode = (selectedBom.bomType || 'EBOM').trim().toUpperCase()
        const versionValue = (selectedBom.versionLevel || '').trim()
        const normalizedVersionValue = normalizeProductAttributeMachineValue(versionValue)
        const versionOption = normalizedVersionValue
            ? attributeOptions?.find((option) => {
                if (normalizeProductAttributeMachineValue(option.categoryKey) !== normalizeProductAttributeMachineValue(PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)) {
                    return false
                }
                const optionValue = (option.value || '').trim()
                return optionValue === versionValue
                    || normalizeProductAttributeMachineValue(optionValue) === normalizedVersionValue
            })
            : undefined
        const ownerDisplay = resolveBOMOwnerDisplay(selectedBom, {
            internalLabel: t('engineering.bomArchive.form.ownerTypeInternal'),
            unknownCustomerLabel: t('engineering.bomArchive.table.ownerUnknown'),
            customerNameMap,
        })
        const ownerCustomerValue = ownerDisplay.ownerType === 'CUSTOMER' ? ownerDisplay.label : '-'
        const measuredWeightValue = formatBOMMeasuredWeight(selectedBom)

        return {
            bomId: selectedBom.id,
            bomNo: (selectedBom.bomNo || '').trim() || selectedBom.id,
            hasSelection: true,
            hint: isChineseLocale
                ? `已绑定 BOM ${((selectedBom.bomNo || '').trim() || selectedBom.id)}`
                : `Bound BOM ${((selectedBom.bomNo || '').trim() || selectedBom.id)}`,
            items: [
                {
                    key: 'bom-type',
                    label: isChineseLocale ? 'BOM类型' : 'BOM Type',
                    value: bomTypeCode === 'MBOM'
                        ? (isChineseLocale ? '生产BOM' : 'MBOM')
                        : (isChineseLocale ? '研发BOM' : 'EBOM'),
                    empty: false,
                },
                {
                    key: 'bom-owner-type',
                    label: isChineseLocale ? '归属' : 'Owner',
                    value: ownerDisplay.ownerType === 'CUSTOMER'
                        ? t('engineering.bomArchive.form.ownerTypeCustomer')
                        : t('engineering.bomArchive.form.ownerTypeInternal'),
                    empty: false,
                },
                {
                    key: 'bom-owner-customer',
                    label: isChineseLocale ? '归属客户' : 'Owner Customer',
                    value: ownerCustomerValue,
                    empty: ownerCustomerValue === '-',
                },
                {
                    key: 'bom-version-level',
                    label: isChineseLocale ? '产品档次' : 'Product Grade',
                    value: versionValue ? getOptionLabel(locale, versionOption) || versionValue : '-',
                    empty: !versionValue,
                },
                {
                    key: 'bom-measured-weight',
                    label: isChineseLocale ? '成品重量' : 'Finished Weight',
                    value: measuredWeightValue || '-',
                    empty: !measuredWeightValue,
                },
            ],
        }
    }, [attributeOptions, customerNameMap, locale, open, selectedBom, t])

    const previewProduct = useMemo(
        () => {
            const baseProduct = {
                ...(allValues as Product),
                name: resolveEffectiveProductName({
                    product: allValues as Product,
                    productTypes,
                }),
                sku: resolveEffectiveProductSku({
                    product: allValues as Product,
                    productTypes,
                    typeCode: selectedType?.code,
                }),
            }

            return upsertAttributeValue(
                baseProduct,
                PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version,
                (selectedBom?.versionLevel || '').trim()
            )
        },
        [allValues, productTypes, selectedBom?.versionLevel, selectedType?.code]
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

    const specPreviewItems = useMemo(() => {
        const aggregateDisplay = resolveProductAggregateDisplay({
            locale,
            product: previewProduct,
            productTypes,
            bom: selectedBom,
            options: attributeOptions,
            customerNameMap,
            ownerTypeInternalLabel: t('engineering.bomArchive.form.ownerTypeInternal'),
            unknownCustomerLabel: t('engineering.bomArchive.table.ownerUnknown'),
            emptyBaseLabel: t('engineering.productArchive.states.unnamed'),
        })
        const titleCoveredKeySet = new Set(aggregateDisplay.titleCoveredKeys)
        const baseItems = specPreviewV2.summaryItems.filter((item) => !titleCoveredKeySet.has(item.key))
        const versionCategoryKey = normalizeProductAttributeMachineValue(PRODUCT_ATTRIBUTE_CATEGORY_KEYS.version)
        const hasVersionItem = baseItems.some((item) => item.key === versionCategoryKey)
        const bomItems = (selectedBomContext?.items ?? []).filter((item) => {
            if (titleCoveredKeySet.has(item.key)) {
                return false
            }

            return item.key !== 'bom-version-level' || !hasVersionItem
        })
        return [...baseItems, ...bomItems]
    }, [attributeOptions, customerNameMap, locale, previewProduct, productTypes, selectedBom, selectedBomContext?.items, specPreviewV2.summaryItems, t])

    const specPreviewAggregateLabel = useMemo(() => {
        return resolveProductAggregateDisplayLabel({
            locale,
            product: previewProduct,
            productTypes,
            bom: selectedBom,
            options: attributeOptions,
            customerNameMap,
            ownerTypeInternalLabel: t('engineering.bomArchive.form.ownerTypeInternal'),
            unknownCustomerLabel: t('engineering.bomArchive.table.ownerUnknown'),
            emptyBaseLabel: t('engineering.productArchive.states.unnamed'),
        })
    }, [attributeOptions, customerNameMap, locale, previewProduct, productTypes, selectedBom, t])

    const specPreviewTitle = specPreviewV2.title
    const specPreviewSummary = specPreviewV2.summaryText
        ? `${specPreviewV2.title} (${specPreviewV2.summaryText})`
        : specPreviewV2.title

    return {
        dynamicTypes,
        specPreviewTitle,
        specPreviewSummary,
        specPreviewAggregateLabel,
        specPreviewV2,
        specPreviewItems,
        selectedBomContext,
        skuPreview,
        nextCodeDeriveError
    }
}
