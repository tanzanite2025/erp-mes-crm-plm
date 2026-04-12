import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type Product } from '../data/schema'
import { type SaveProductInput } from '../mutation-types'
import { PRODUCTS_QUERY_KEY } from '../query-keys'
import { ProductMaintenanceService } from '../services/product-maintenance-service'

export function useProductWriteActions() {
  const queryClient = useQueryClient()

  const saveProductsMutation = useMutation({
    mutationFn: async (products: SaveProductInput[]) => {
      const savedProducts: Product[] = []
      for (const product of products) {
        savedProducts.push(await ProductMaintenanceService.saveProduct(product))
      }
      return savedProducts
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })

  const syncProductsMutation = useMutation({
    mutationFn: (products: SaveProductInput[]) => ProductMaintenanceService.bulkSyncProducts(products),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => ProductMaintenanceService.deleteProduct(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY })
    },
  })

  return {
    saveProducts: saveProductsMutation.mutateAsync,
    syncProducts: syncProductsMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    isSavingProducts: saveProductsMutation.isPending,
    isSyncingProducts: syncProductsMutation.isPending,
    isDeletingProduct: deleteProductMutation.isPending,
  }
}
