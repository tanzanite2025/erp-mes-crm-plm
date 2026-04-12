import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import type { CreateReceiptRecordApiDTO } from '../contracts/receivable-api-dto'
import { createReceiptRecord, getReceivableLedgerDetail } from '../services/receivable-ledger-detail-service'

export function useReceivableLedgerDetail(id: string | null) {
  return useQuery({
    queryKey: tradingQueryKeys.receivableDetail(id ?? 'pending'),
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
        queryClient.invalidateQueries({ queryKey: tradingQueryKeys.receivables() }),
        queryClient.invalidateQueries({ queryKey: tradingQueryKeys.receivableDetail(variables.id) }),
      ])
    },
  })
}
