import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import type { CreateSettlementRecordEvidenceApiDTO } from '../contracts/settlement-evidence-api-dto'
import {
  createSettlementRecordEvidence,
  deleteSettlementRecordEvidence,
  getSettlementRecordEvidences,
  type SettlementRecordEvidenceType,
} from '../services/settlement-evidence-service'

export function useSettlementRecordEvidences(type: SettlementRecordEvidenceType, recordId: string | null) {
  return useQuery({
    queryKey: tradingQueryKeys.settlementRecordEvidences(type, recordId ?? 'pending'),
    queryFn: () => getSettlementRecordEvidences(type, recordId as string),
    enabled: Boolean(recordId),
  })
}

export function useCreateSettlementRecordEvidence(type: SettlementRecordEvidenceType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recordId, payload }: { recordId: string; payload: CreateSettlementRecordEvidenceApiDTO }) =>
      createSettlementRecordEvidence(type, recordId, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.settlementRecordEvidences(type, variables.recordId),
      })
    },
  })
}

export function useDeleteSettlementRecordEvidence(type: SettlementRecordEvidenceType) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ recordId, evidenceId }: { recordId: string; evidenceId: string }) =>
      deleteSettlementRecordEvidence(type, recordId, evidenceId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.settlementRecordEvidences(type, variables.recordId),
      })
    },
  })
}
