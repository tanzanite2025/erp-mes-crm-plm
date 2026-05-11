import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '@/features/engineering-db/query-keys'
import { SpecsService } from '@/features/engineering-db/services/specs-service'
import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { productTemplateService } from '../services/product-template-service'
import { type ProductTemplateResolution } from '../utils/product-template-resolution'
import { type ProductDisplaySummaryItemV2 } from '../display/product-display-v2'
import { resolveProductDisplayMetadataV2 } from '../display/product-display-v2-metadata'

export interface EngineeringProductDisplayMetadata {
  resolvedTemplate: ProductTemplate | null
  templateResolution: ProductTemplateResolution
  dynamicSummaryItems: ProductDisplaySummaryItemV2[]
  engineeringSpecLabel: string | null
}

interface UseEngineeringProductDisplayMetadataParams {
  products: Product[]
  productTypes: ProductType[]
}

function formatEngineeringSpecLabel(spec: { name: string; revisionNo?: string | null }): string {
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
    queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
  })

  const optionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
  })

  const specsQuery = useQuery({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
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

  const productDisplayMetadataMap = useMemo<Map<string, EngineeringProductDisplayMetadata>>(() => {
    if (!templatesQuery.data || !categoriesQuery.data || !optionsQuery.data || !specsQuery.data) {
      return new Map()
    }

    const activeOptions = optionsQuery.data.filter((option) => option.active)
    const specsLookup = new Map(specsQuery.data.map((spec) => [spec.id, spec]))

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
        const engineeringSpec = engineeringSpecId ? specsLookup.get(engineeringSpecId) : undefined

        return [
          product.id,
          {
            resolvedTemplate: displayMetadata.resolvedTemplate,
            templateResolution: displayMetadata.templateResolution,
            dynamicSummaryItems: displayMetadata.projection?.summaryItems ?? [],
            engineeringSpecLabel: engineeringSpec
              ? formatEngineeringSpecLabel(engineeringSpec)
              : engineeringSpecId || null,
          } satisfies EngineeringProductDisplayMetadata,
        ]
      }),
    )
  }, [categoriesQuery.data, locale, optionsQuery.data, productTypes, products, specsQuery.data, t, templatesQuery.data])

  return {
    productDisplayMetadataMap,
    isLoading:
      templatesQuery.isLoading
      || categoriesQuery.isLoading
      || optionsQuery.isLoading
      || specsQuery.isLoading,
    error: templatesQuery.error ?? categoriesQuery.error ?? optionsQuery.error ?? specsQuery.error,
  }
}
