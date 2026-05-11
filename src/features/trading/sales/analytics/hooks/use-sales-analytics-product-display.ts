import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import {
  type ProductDisplayProjectionV2,
} from '@/features/engineering/display/product-display-v2'
import { buildProductDisplayMapsV2 } from '@/features/engineering/display/product-display-v2-map'
import type {
  Product,
  ProductAttributeCategory,
  ProductAttributeOption,
  ProductTemplate,
  ProductType,
} from '@/features/engineering/data/schema'
import { useGetProducts } from '@/features/engineering/hooks/use-products'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
} from '@/features/engineering/query-keys'
import { ProductAttributeCategoryService } from '@/features/engineering/services/product-attribute-category-service'
import { ProductAttributeOptionService } from '@/features/engineering/services/product-attribute-option-service'
import { productTemplateService } from '@/features/engineering/services/product-template-service'
import { ProductTypeService } from '@/features/engineering/services/product-type-service'

export function useSalesAnalyticsProductDisplayMap(): Map<string, ProductDisplayProjectionV2> {
  const { locale } = useLanguage()
  const productsQuery = useGetProducts()
  const productTemplatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
  })
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
  })
  const productAttributeCategoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () => ProductAttributeCategoryService.getProductAttributeCategories({ activeOnly: true }),
  })
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions({ activeOnly: true }),
  })

  return useMemo(() => {
    if (
      productsQuery.isPending
      || productTemplatesQuery.isPending
      || productTypesQuery.isPending
      || productAttributeCategoriesQuery.isPending
      || productAttributeOptionsQuery.isPending
    ) {
      return new Map<string, ProductDisplayProjectionV2>()
    }

    if (
      productsQuery.error
      || productTemplatesQuery.error
      || productTypesQuery.error
      || productAttributeCategoriesQuery.error
      || productAttributeOptionsQuery.error
    ) {
      return new Map<string, ProductDisplayProjectionV2>()
    }

    const products = (productsQuery.data as Product[]) ?? []
    const productTemplates = (productTemplatesQuery.data as ProductTemplate[]) ?? []
    const productTypes = (productTypesQuery.data as ProductType[]) ?? []
    const productAttributeCategories =
      (productAttributeCategoriesQuery.data as ProductAttributeCategory[]) ?? []
    const productAttributeOptions =
      (productAttributeOptionsQuery.data as ProductAttributeOption[]) ?? []

    return buildProductDisplayMapsV2({
      locale,
      products,
      productTemplates,
      productTypes,
      productAttributeCategories,
      productAttributeOptions,
    }).productDisplayProjectionMap
  }, [
    locale,
    productAttributeCategoriesQuery.data,
    productAttributeCategoriesQuery.error,
    productAttributeCategoriesQuery.isPending,
    productAttributeOptionsQuery.data,
    productAttributeOptionsQuery.error,
    productAttributeOptionsQuery.isPending,
    productsQuery.data,
    productsQuery.error,
    productsQuery.isPending,
    productTemplatesQuery.data,
    productTemplatesQuery.error,
    productTemplatesQuery.isPending,
    productTypesQuery.data,
    productTypesQuery.error,
    productTypesQuery.isPending,
  ])
}
