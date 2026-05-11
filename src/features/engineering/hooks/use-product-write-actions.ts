import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { type Product } from '../data/schema'
import { type SaveProductOperation } from '../mutation-types'
import {
  isProductDetailQueryKey,
  productListQueryKeyPrefix,
  productManagementQueryKey,
  productOptionsQueryKey,
} from '../query-keys'
import { ProductMaintenanceService } from '../services/product-maintenance-service'

export function useProductWriteActions() {
  const queryClient = useQueryClient()

  const invalidateProductQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: productManagementQueryKey() }),
      queryClient.invalidateQueries({ queryKey: productOptionsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: tradingQueryKeys.salesOrderPackagingProductOptions() }),
      queryClient.invalidateQueries({ queryKey: productListQueryKeyPrefix() }),
      queryClient.invalidateQueries({
        predicate: (query) => isProductDetailQueryKey(query.queryKey),
      }),
    ])
  }

  const saveProductsMutation = useMutation({
    mutationFn: async (products: SaveProductOperation[]) => {
      const savedProducts: Product[] = []
      for (const product of products) {
        savedProducts.push(await ProductMaintenanceService.saveProduct(product.data, product.currentRow))
      }
      return savedProducts
    },
    onSuccess: async () => {
      await invalidateProductQueries()
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => ProductMaintenanceService.deleteProduct(id),
    onSuccess: async () => {
      await invalidateProductQueries()
    },
  })

  return {
    saveProducts: saveProductsMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    isSavingProducts: saveProductsMutation.isPending,
    isDeletingProduct: deleteProductMutation.isPending,
  }
}
