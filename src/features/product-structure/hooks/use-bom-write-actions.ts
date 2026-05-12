import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type SaveBOMInput } from '../mutation-types'
import { BOMS_QUERY_KEY } from '../query-keys'
import { bomVersionTraceQueryKeys } from '../version-trace/query-keys'
import { bomService } from '../services/bom-service'

export function useBOMWriteActions() {
  const queryClient = useQueryClient()

  const saveBOMMutation = useMutation({
    mutationFn: (params: { data: SaveBOMInput }) =>
      bomService.saveBOM(params),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: bomVersionTraceQueryKeys.root() })
    },
  })

  const deleteBOMMutation = useMutation({
    mutationFn: (id: string) => bomService.deleteBOM(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: BOMS_QUERY_KEY })
      await queryClient.invalidateQueries({ queryKey: bomVersionTraceQueryKeys.root() })
    },
  })

  return {
    saveBOM: saveBOMMutation.mutateAsync,
    deleteBOM: deleteBOMMutation.mutateAsync,
    isSavingBOM: saveBOMMutation.isPending,
    isDeletingBOM: deleteBOMMutation.isPending,
  }
}
