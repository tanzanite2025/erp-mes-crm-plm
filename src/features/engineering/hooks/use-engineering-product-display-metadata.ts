import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '@/features/engineering-db/query-keys'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import { BOMS_QUERY_KEY } from '@/features/product-structure/query-keys'
import { bomService } from '@/features/product-structure/services/bom-service'
import { getCustomers } from '@/features/trading/customer'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import { type ProductDisplaySummaryItemV2 } from '../display/product-display-v2'
import { resolveProductDisplayMetadataV2 } from '../display/product-display-v2-metadata'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { productTemplateService } from '../services/product-template-service'
import { resolveProductAggregateDisplay } from '../utils/product-display-aggregate'
import { type ProductTemplateResolution } from '../utils/product-template-resolution'

export interface EngineeringProductDisplayMetadata {
  resolvedTemplate: ProductTemplate | null
  templateResolution: ProductTemplateResolution
  dynamicSummaryItems: ProductDisplaySummaryItemV2[]
  aggregateSupplementalItems: ProductDisplaySummaryItemV2[]
  engineeringSpecLabel: string | null
}

interface UseEngineeringProductDisplayMetadataParams {
  products: Product[]
  productTypes: ProductType[]
}

function formatEngineeringSpecLabel(spec: {
  name: string
  revisionNo?: string | null
}): string {
  const revisionNo = spec.revisionNo?.trim() ?? ''
  return revisionNo ? `${spec.name} (${revisionNo})` : spec.name
}

export function useEngineeringProductDisplayMetadata({
  products,
  productTypes,
}: UseEngineeringProductDisplayMetadataParams) {
  const { locale, t } = useLanguage()

  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
  })

  const categoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories({
        activeOnly: true,
      }),
  })

  const optionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () =>
      ProductAttributeOptionService.getProductAttributeOptions({
        activeOnly: true,
      }),
  })

  const specsQuery = useQuery({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
  })
  const bomsQuery = useQuery({
    queryKey: BOMS_QUERY_KEY,
    queryFn: () => bomService.getBOMs(),
  })
  const customersQuery = useQuery({
    queryKey: tradingQueryKeys.customers(),
    queryFn: getCustomers,
  })

  if (templatesQuery.isSuccess && !templatesQuery.data) {
    throw new Error('[CRITICAL] Product Templates Data missing')
  }

  if (categoriesQuery.isSuccess && !categoriesQuery.data) {
    throw new Error('[CRITICAL] Product Attribute Categories Data missing')
  }

  if (optionsQuery.isSuccess && !optionsQuery.data) {
    throw new Error('[CRITICAL] Product Attribute Options Data missing')
  }

  if (specsQuery.isSuccess && !specsQuery.data) {
    throw new Error('[CRITICAL] Engineering Specs Data missing')
  }

  const productDisplayMetadataMap = useMemo<
    Map<string, EngineeringProductDisplayMetadata>
  >(() => {
    if (
      !templatesQuery.data ||
      !categoriesQuery.data ||
      !optionsQuery.data ||
      !specsQuery.data ||
      !bomsQuery.data ||
      !customersQuery.data
    ) {
      return new Map()
    }

    const activeOptions = optionsQuery.data.filter((option) => option.active)
    const specsLookup = new Map(specsQuery.data.map((spec) => [spec.id, spec]))
    const customerNameMap = new Map(
      customersQuery.data.map((customer) => [customer.id, customer.name])
    )

    return new Map(
      products.map((product) => {
        const displayMetadata = resolveProductDisplayMetadataV2({
          locale,
          product,
          templates: templatesQuery.data,
          productTypes,
          categories: categoriesQuery.data,
          options: activeOptions,
          emptyValue: t('engineering.productMgmt.noBinding'),
        })
        const engineeringSpecId = product.engineeringSpecId?.trim() || ''
        const engineeringSpec = engineeringSpecId
          ? specsLookup.get(engineeringSpecId)
          : undefined
        const selectedBom =
          bomsQuery.data.find((bom) => bom.id === product.bomId) ?? null
        const aggregateDisplay = resolveProductAggregateDisplay({
          locale,
          product,
          productTypes,
          bom: selectedBom,
          categories: categoriesQuery.data,
          options: activeOptions,
          customerNameMap,
          ownerTypeInternalLabel: t(
            'engineering.bomArchive.form.ownerTypeInternal'
          ),
          ownerTypeCustomerLabel: t(
            'engineering.bomArchive.form.ownerTypeCustomer'
          ),
          unknownCustomerLabel: t('engineering.bomArchive.table.ownerUnknown'),
          emptyBaseLabel: t('engineering.productArchive.states.unnamed'),
          emptyValue: t('engineering.productMgmt.noBinding'),
        })
        const titleCoveredKeySet = new Set(aggregateDisplay.titleCoveredKeys)
        const dynamicSummaryItems = (
          displayMetadata.projection?.summaryItems ?? []
        ).filter((item) => !titleCoveredKeySet.has(item.key))
        const dynamicSummaryKeySet = new Set(
          dynamicSummaryItems.map((item) => item.key)
        )
        const aggregateSupplementalItems =
          aggregateDisplay.supplementalItems.filter(
            (item) =>
              !titleCoveredKeySet.has(item.key) &&
              !dynamicSummaryKeySet.has(item.key)
          )

        return [
          product.id,
          {
            resolvedTemplate: displayMetadata.resolvedTemplate,
            templateResolution: displayMetadata.templateResolution,
            dynamicSummaryItems,
            aggregateSupplementalItems,
            engineeringSpecLabel: engineeringSpec
              ? formatEngineeringSpecLabel(engineeringSpec)
              : engineeringSpecId || null,
          } satisfies EngineeringProductDisplayMetadata,
        ]
      })
    )
  }, [
    bomsQuery.data,
    categoriesQuery.data,
    customersQuery.data,
    locale,
    optionsQuery.data,
    productTypes,
    products,
    specsQuery.data,
    t,
    templatesQuery.data,
  ])

  return {
    productDisplayMetadataMap,
    isLoading:
      templatesQuery.isLoading ||
      categoriesQuery.isLoading ||
      optionsQuery.isLoading ||
      bomsQuery.isLoading ||
      customersQuery.isLoading ||
      specsQuery.isLoading,
    error:
      templatesQuery.error ??
      categoriesQuery.error ??
      optionsQuery.error ??
      bomsQuery.error ??
      customersQuery.error ??
      specsQuery.error,
  }
}
