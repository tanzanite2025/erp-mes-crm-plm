import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  sortProductAppearanceCatalog,
  type ProductAppearance,
  type ProductAppearanceDraft,
} from '../data/product-appearance'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '../query-keys'
import { productAppearanceService } from '../services/product-appearance-service'

export function useProductAppearanceWriteActions() {
  const queryClient = useQueryClient()
  const saveMutation = useMutation({
    mutationKey: [...PRODUCT_APPEARANCES_QUERY_KEY, 'save'],
    mutationFn: ({
      draft,
      current,
    }: {
      draft: ProductAppearanceDraft
      current?: ProductAppearance
    }) => productAppearanceService.saveProductAppearance(draft, current),
    onSuccess: async (savedAppearance) => {
      await queryClient.cancelQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
      queryClient.setQueriesData<ProductAppearance[]>(
        { queryKey: PRODUCT_APPEARANCES_QUERY_KEY },
        (cached) =>
          cached
            ? sortProductAppearanceCatalog([
                ...cached.filter((item) => item.id !== savedAppearance.id),
                savedAppearance,
              ])
            : undefined
      )
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
    },
  })
  const deleteMutation = useMutation({
    mutationKey: [...PRODUCT_APPEARANCES_QUERY_KEY, 'delete'],
    mutationFn: (id: string) =>
      productAppearanceService.deleteProductAppearance(id),
    onSuccess: async (_result, id) => {
      await queryClient.cancelQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
      queryClient.setQueriesData<ProductAppearance[]>(
        { queryKey: PRODUCT_APPEARANCES_QUERY_KEY },
        (cached) => cached?.filter((item) => item.id !== id)
      )
      await queryClient.invalidateQueries({
        queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
      })
    },
  })
  return {
    saveAppearance: saveMutation.mutateAsync,
    deleteAppearance: deleteMutation.mutateAsync,
    isSavingAppearance: saveMutation.isPending,
    isDeletingAppearance: deleteMutation.isPending,
  }
}
