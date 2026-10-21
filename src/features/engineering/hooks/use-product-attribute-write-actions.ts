import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type ProductTemplateAttributeLevelOneCategory,
  type ProductTemplateAttributeLevelTwoOption,
} from '../data/schema'
import {
  type SaveProductTemplateAttributeLevelOneCategoryInput,
  type SaveProductTemplateAttributeLevelTwoOptionInput,
} from '../mutation-types'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'
import { areSameProductAttributeCategoryKey } from '../utils/product-attribute-machine-value'

interface ReorderProductAttributeOptionsInput {
  categoryKey: string
  ids: string[]
}

function upsertProductAttributeSavedItemInCachedCatalog<
  T extends { id: string; active: boolean; sortOrder: number },
>(
  cachedItems: T[] | undefined,
  savedItem: T,
  activeOnly: boolean
): T[] | undefined {
  if (!cachedItems) return undefined
  const nextItems = cachedItems.filter((item) => item.id !== savedItem.id)
  if (!activeOnly || savedItem.active) nextItems.push(savedItem)
  return nextItems.sort((left, right) => left.sortOrder - right.sortOrder)
}

export function useProductAttributeWriteActions() {
  const queryClient = useQueryClient()

  const saveCategoryMutation = useMutation({
    mutationFn: ({
      category,
      current,
    }: {
      category: SaveProductTemplateAttributeLevelOneCategoryInput
      current?: ProductTemplateAttributeLevelOneCategory
    }) =>
      ProductAttributeCategoryService.saveProductAttributeCategory(
        category,
        current
      ),
    onSuccess: async (savedCategory) => {
      await queryClient.cancelQueries({
        queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
      })
      queryClient.setQueryData<ProductTemplateAttributeLevelOneCategory[]>(
        PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
        (cachedItems) =>
          upsertProductAttributeSavedItemInCachedCatalog(
            cachedItems,
            savedCategory,
            true
          )
      )
      queryClient.setQueryData<ProductTemplateAttributeLevelOneCategory[]>(
        PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY,
        (cachedItems) =>
          upsertProductAttributeSavedItemInCachedCatalog(
            cachedItems,
            savedCategory,
            false
          )
      )
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
      })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) =>
      ProductAttributeCategoryService.deleteProductAttributeCategory(id),
    onSuccess: async (_response, deletedCategoryId) => {
      await Promise.all([
        queryClient.cancelQueries({
          queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
        }),
        queryClient.cancelQueries({
          queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
        }),
      ])
      const deletedCategory = [
        ...(queryClient.getQueryData<
          ProductTemplateAttributeLevelOneCategory[]
        >(PRODUCT_ATTRIBUTE_CATEGORY_MANAGEMENT_QUERY_KEY) ?? []),
        ...(queryClient.getQueryData<
          ProductTemplateAttributeLevelOneCategory[]
        >(PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY) ?? []),
      ].find((category) => category.id === deletedCategoryId)
      queryClient.setQueriesData<ProductTemplateAttributeLevelOneCategory[]>(
        { queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY },
        (cachedItems) =>
          cachedItems?.filter((category) => category.id !== deletedCategoryId)
      )
      if (deletedCategory) {
        queryClient.setQueriesData<ProductTemplateAttributeLevelTwoOption[]>(
          { queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY },
          (cachedItems) =>
            cachedItems?.filter(
              (option) =>
                !areSameProductAttributeCategoryKey(
                  option.categoryKey,
                  deletedCategory.key
                )
            )
        )
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
        }),
        queryClient.invalidateQueries({
          queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
        }),
      ])
    },
  })

  const reorderCategoriesMutation = useMutation({
    mutationFn:
      ProductAttributeCategoryService.reorderProductAttributeCategories,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
      })
    },
    onError: async () => {
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
      })
    },
  })

  const saveOptionMutation = useMutation({
    mutationFn: ({
      option,
      current,
    }: {
      option: SaveProductTemplateAttributeLevelTwoOptionInput
      current?: ProductTemplateAttributeLevelTwoOption
    }) =>
      ProductAttributeOptionService.saveProductAttributeOption(option, current),
    onSuccess: async (savedOption) => {
      await queryClient.cancelQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      })
      queryClient.setQueryData<ProductTemplateAttributeLevelTwoOption[]>(
        PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
        (cachedItems) =>
          upsertProductAttributeSavedItemInCachedCatalog(
            cachedItems,
            savedOption,
            true
          )
      )
      queryClient.setQueryData<ProductTemplateAttributeLevelTwoOption[]>(
        PRODUCT_ATTRIBUTE_OPTION_MANAGEMENT_QUERY_KEY,
        (cachedItems) =>
          upsertProductAttributeSavedItemInCachedCatalog(
            cachedItems,
            savedOption,
            false
          )
      )
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      })
    },
  })

  const deleteOptionMutation = useMutation({
    mutationFn: (id: string) =>
      ProductAttributeOptionService.deleteProductAttributeOption(id),
    onSuccess: async (_response, deletedOptionId) => {
      await queryClient.cancelQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      })
      queryClient.setQueriesData<ProductTemplateAttributeLevelTwoOption[]>(
        { queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY },
        (cachedItems) =>
          cachedItems?.filter((option) => option.id !== deletedOptionId)
      )
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      })
    },
  })

  const reorderOptionsMutation = useMutation({
    mutationFn: ({ categoryKey, ids }: ReorderProductAttributeOptionsInput) =>
      ProductAttributeOptionService.reorderProductAttributeOptions(
        categoryKey,
        ids
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      })
    },
    onError: async () => {
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      })
    },
  })

  return {
    saveCategory: (
      category: SaveProductTemplateAttributeLevelOneCategoryInput,
      current?: ProductTemplateAttributeLevelOneCategory
    ) => saveCategoryMutation.mutateAsync({ category, current }),
    deleteCategory: deleteCategoryMutation.mutateAsync,
    reorderCategories: reorderCategoriesMutation.mutateAsync,
    saveOption: (
      option: SaveProductTemplateAttributeLevelTwoOptionInput,
      current?: ProductTemplateAttributeLevelTwoOption
    ) => saveOptionMutation.mutateAsync({ option, current }),
    deleteOption: deleteOptionMutation.mutateAsync,
    reorderOptions: reorderOptionsMutation.mutateAsync,
    isSavingCategory: saveCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isReorderingCategories: reorderCategoriesMutation.isPending,
    isSavingOption: saveOptionMutation.isPending,
    isDeletingOption: deleteOptionMutation.isPending,
    isReorderingOptions: reorderOptionsMutation.isPending,
  }
}
