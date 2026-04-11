import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ProductType } from '../data/schema'
import { type SaveProductTypeInput } from '../mutation-types'
import { PRODUCT_TYPES_QUERY_KEY } from '../query-keys'
import { ProductTypeService } from '../services/product-type-service'

interface SaveProductTypeParams {
  formData: SaveProductTypeInput
  currentRow?: ProductType
}

export function useProductTypeWriteActions() {
  const queryClient = useQueryClient()

  const saveProductTypeMutation = useMutation({
    mutationFn: ({ formData, currentRow }: SaveProductTypeParams) =>
      ProductTypeService.saveProductType(formData, currentRow),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_TYPES_QUERY_KEY })
    },
  })

  const deleteProductTypeMutation = useMutation({
    mutationFn: (id: string) => ProductTypeService.deleteProductType(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_TYPES_QUERY_KEY })
    },
  })

  return {
    saveProductType: saveProductTypeMutation.mutateAsync,
    deleteProductType: deleteProductTypeMutation.mutateAsync,
    isSavingProductType: saveProductTypeMutation.isPending,
    isDeletingProductType: deleteProductTypeMutation.isPending,
  }
}
