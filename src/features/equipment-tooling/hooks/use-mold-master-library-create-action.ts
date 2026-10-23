import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Mold } from '../data/schema'
import { MOLD_MASTER_LIBRARY_SELECTION_OPTIONS_QUERY_KEY } from '../mold-master-library-query-keys'
import { invalidateMoldMasterLibraryQueriesAfterWrite } from '../queries/invalidate-mold-master-library-queries-after-write'
import { MoldTransactionService } from '../services/mold-transaction-service'

export function useMoldMasterLibraryCreateAction() {
  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: (mold: Mold) => MoldTransactionService.createMold(mold),
    onSuccess: async (saved) => {
      queryClient.setQueryData<Mold[]>(
        MOLD_MASTER_LIBRARY_SELECTION_OPTIONS_QUERY_KEY,
        (previous) =>
          previous
            ? [...previous.filter((mold) => mold.id !== saved.id), saved]
            : undefined
      )
      await invalidateMoldMasterLibraryQueriesAfterWrite(queryClient)
    },
  })
  return {
    createMoldInMasterLibrary: createMutation.mutateAsync,
  }
}
