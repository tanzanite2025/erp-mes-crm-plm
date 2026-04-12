import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  type SaveProductAttributeCategoryInput,
  type SaveProductAttributeOptionInput,
} from '../mutation-types'
import { normalizeProductAttributeMachineValue } from '../utils/product-attribute-machine-value'
import {
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
} from '../query-keys'
import { ProductAttributeCategoryService } from '../services/product-attribute-category-service'
import { ProductAttributeOptionService } from '../services/product-attribute-option-service'

export function useProductAttributeWriteActions() {
  const queryClient = useQueryClient()

  const saveCategoryMutation = useMutation({
    mutationFn: (category: SaveProductAttributeCategoryInput) =>
      ProductAttributeCategoryService.saveProductAttributeCategory({
        ...category,
        key: normalizeProductAttributeMachineValue(category.key),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => ProductAttributeCategoryService.deleteProductAttributeCategory(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY }),
      ])
    },
  })

  const saveOptionMutation = useMutation({
    mutationFn: (option: SaveProductAttributeOptionInput) =>
      ProductAttributeOptionService.saveProductAttributeOption({
        ...option,
        categoryKey: normalizeProductAttributeMachineValue(option.categoryKey),
        value: normalizeProductAttributeMachineValue(option.value),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY })
    },
  })

  const deleteOptionMutation = useMutation({
    mutationFn: (id: string) => ProductAttributeOptionService.deleteProductAttributeOption(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY })
    },
  })

  return {
    saveCategory: saveCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    saveOption: saveOptionMutation.mutateAsync,
    deleteOption: deleteOptionMutation.mutateAsync,
    isSavingCategory: saveCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    isSavingOption: saveOptionMutation.isPending,
    isDeletingOption: deleteOptionMutation.isPending,
  }
}
