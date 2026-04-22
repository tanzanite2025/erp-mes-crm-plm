import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateReceiptRecordApiDTO } from '../contracts/receivable-api-dto'
import { receivableQueryKeys } from '../query-keys'
import { createReceiptRecord, getReceivableLedgerDetail } from '../services/receivable-ledger-detail-service'

export function useReceivableLedgerDetail(id: string | null) {
  return useQuery({
    queryKey: receivableQueryKeys.receivableDetail(id ?? 'pending'),
    queryFn: () => getReceivableLedgerDetail(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateReceiptRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateReceiptRecordApiDTO }) =>
      createReceiptRecord(id, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: receivableQueryKeys.receivables() }),
        queryClient.invalidateQueries({ queryKey: receivableQueryKeys.receivableDetail(variables.id) }),
      ])
    },
  })
}
