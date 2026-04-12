import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import type { CreatePaymentRecordApiDTO } from '../contracts/payable-api-dto'
import { createPaymentRecord, getPayableLedgerDetail } from '../services/payable-ledger-detail-service'

export function usePayableLedgerDetail(id: string | null) {
  return useQuery({
    queryKey: tradingQueryKeys.payableDetail(id ?? 'pending'),
    queryFn: () => getPayableLedgerDetail(id as string),
    enabled: Boolean(id),
  })
}

export function useCreatePaymentRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreatePaymentRecordApiDTO }) =>
      createPaymentRecord(id, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tradingQueryKeys.payables() }),
        queryClient.invalidateQueries({ queryKey: tradingQueryKeys.payableDetail(variables.id) }),
      ])
    },
  })
}
