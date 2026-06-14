import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type NumberingRule } from '../data/schema'
import { BASIC_SETTINGS_NUMBERING_RULES_QUERY_KEY } from '../query-keys'
import { numberingService } from '../services/numbering-service'

export function useNumberingRules() {
  const queryClient = useQueryClient()

  const rulesQuery = useQuery({
    queryKey: BASIC_SETTINGS_NUMBERING_RULES_QUERY_KEY,
    queryFn: () => numberingService.getRules(),
  })
  const { data, isLoading, error, refetch } = rulesQuery

  const saveRuleMutation = useMutation({
    mutationFn: (input: Partial<NumberingRule>) =>
      numberingService.saveRule(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: BASIC_SETTINGS_NUMBERING_RULES_QUERY_KEY,
      })
    },
  })

  const refreshRules = useCallback(async () => {
    await refetch()
  }, [refetch])

  return {
    rules: data ?? [],
    isLoading,
    error,
    refreshRules,
    saveRule: saveRuleMutation.mutateAsync,
    isSaving: saveRuleMutation.isPending,
  }
}
