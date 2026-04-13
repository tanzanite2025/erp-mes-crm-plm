import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PersonalRecordReorderPayloadItem, PersonalRecordUpsertPayload } from '../data/schema'
import {
  createPersonalRecord,
  getPersonalRecords,
  patchPersonalRecord,
  reorderPersonalRecords,
} from '../services/personal-workbench-service'

export const personalWorkbenchQueryKeys = {
  records: (): readonly ['personal-workbench', 'records'] => ['personal-workbench', 'records'],
} as const

export function usePersonalWorkbenchRecords() {
  return useQuery({
    queryKey: personalWorkbenchQueryKeys.records(),
    queryFn: getPersonalRecords,
  })
}

export function usePersonalWorkbenchMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: PersonalRecordUpsertPayload) => createPersonalRecord(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: personalWorkbenchQueryKeys.records() })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PersonalRecordUpsertPayload }) => patchPersonalRecord(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: personalWorkbenchQueryKeys.records() })
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (payload: PersonalRecordReorderPayloadItem[]) => reorderPersonalRecords(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: personalWorkbenchQueryKeys.records() })
    },
  })

  return {
    createMutation,
    reorderMutation,
    updateMutation,
  }
}
