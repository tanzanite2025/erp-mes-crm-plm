import { useQuery } from '@tanstack/react-query'
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../data/schema'
import {
  PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'

const EMPTY_PRODUCT_ATTRIBUTE_CATEGORIES: ProductTemplateAttributeLevelOneCategory[] =
  []
const EMPTY_PRODUCT_ATTRIBUTE_OPTIONS: ProductTemplateAttributeLevelTwoOption[] =
  []

export function useProductAttributeCatalogQueries({
  includeOptions = true,
} = {}) {
  const categoriesQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
    queryFn: () =>
      ProductAttributeCategoryService.getProductAttributeCategories(),
  })
  const optionsQuery = useQuery({
    queryKey: PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
    queryFn: () => ProductAttributeOptionService.getProductAttributeOptions(),
    enabled: includeOptions,
  })

  async function retryProductAttributeCatalogQueries() {
    await Promise.all([
      categoriesQuery.refetch(),
      ...(includeOptions ? [optionsQuery.refetch()] : []),
    ])
  }

  return {
    categories:
      categoriesQuery.data?.filter((category) => !category.templateId) ??
      EMPTY_PRODUCT_ATTRIBUTE_CATEGORIES,
    options:
      optionsQuery.data?.filter((option) => !option.templateId) ??
      EMPTY_PRODUCT_ATTRIBUTE_OPTIONS,
    hasLoadedCatalog:
      categoriesQuery.data !== undefined &&
      (!includeOptions || optionsQuery.data !== undefined),
    isLoading:
      categoriesQuery.isPending || (includeOptions && optionsQuery.isPending),
    error:
      categoriesQuery.error ?? (includeOptions ? optionsQuery.error : null),
    retry: retryProductAttributeCatalogQueries,
  }
}
