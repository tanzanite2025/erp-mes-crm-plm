'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/context/language-provider'
import { resolveProductDisplayV2 } from '../display/product-display-v2'
import { resolveProductDisplayMetadataV2 } from '../display/product-display-v2-metadata'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_TYPES_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { productTemplateService } from '../services/product-template-service'
import { ProductTypeService } from '../services/product-type-service'
import { useGetProducts } from './use-products'

export interface ProductDisplayOption {
  label: string
  value: string
}

interface UseProductDisplayOptionsOptions {
  enabled?: boolean
}

export function useProductDisplayOptions({
  enabled = true,
}: UseProductDisplayOptionsOptions = {}) {
  const { locale } = useLanguage()
  const productsQuery = useGetProducts({ enabled })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const productTemplatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates(),
    enabled,
  })
  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
    enabled,
  })
  const productAttributeCategoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories({
        activeOnly: true,
      }),
    enabled,
  })
  const productAttributeOptionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
    queryFn: () =>
      ProductAttributeOptionService.getProductAttributeOptions({
        activeOnly: true,
      }),
    enabled,
  })

  const hasProductDisplayMetadata = Boolean(
    productTemplatesQuery.data &&
    productTypesQuery.data &&
    productAttributeCategoriesQuery.data &&
    productAttributeOptionsQuery.data
  )

  const productOptions = useMemo<ProductDisplayOption[]>(
    () =>
      products.map((product) => {
        const displayMetadata = hasProductDisplayMetadata
          ? resolveProductDisplayMetadataV2({
              locale,
              product,
              templates: productTemplatesQuery.data ?? [],
              productTypes: productTypesQuery.data ?? [],
              categories: productAttributeCategoriesQuery.data ?? [],
              options: productAttributeOptionsQuery.data ?? [],
            })
          : null
        const projection =
          displayMetadata?.projection ??
          resolveProductDisplayV2({
            locale,
            product,
          })

        return {
          label: projection.title,
          value: product.id,
        }
      }),
    [
      hasProductDisplayMetadata,
      locale,
      productAttributeCategoriesQuery.data,
      productAttributeOptionsQuery.data,
      productTemplatesQuery.data,
      productTypesQuery.data,
      products,
    ]
  )

  const productDisplayLabelMap = useMemo(
    () => new Map(productOptions.map((item) => [item.value, item.label])),
    [productOptions]
  )

  return {
    products,
    productOptions,
    productDisplayLabelMap,
    isLoading: Boolean(
      productsQuery.isPending ||
      productTemplatesQuery.isPending ||
      productTypesQuery.isPending ||
      productAttributeCategoriesQuery.isPending ||
      productAttributeOptionsQuery.isPending
    ),
  }
}
