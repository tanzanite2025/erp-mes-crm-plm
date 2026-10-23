import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY } from '@/features/engineering/query-keys'
import {
  BOMPerformanceVersionOptionService,
  type BOMPerformanceVersionOption,
  type SaveBOMPerformanceVersionOptionInput,
} from '../services/bom-performance-version-option-service'

export const BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY = [
  'product-structure',
  'bom-performance-version-options',
] as const

const EMPTY_BOM_PERFORMANCE_VERSION_OPTIONS: BOMPerformanceVersionOption[] = []

export function useBOMPerformanceVersionOptions() {
  const queryClient = useQueryClient()
  const optionsQuery = useQuery({
    queryKey: BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY,
    queryFn: BOMPerformanceVersionOptionService.listPerformanceVersionOptions,
  })

  async function refreshBOMPerformanceVersionOptionDisplays() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY,
      }),
      queryClient.invalidateQueries({
        queryKey: PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
      }),
    ])
  }

  const saveOptionMutation = useMutation({
    mutationFn: ({
      input,
      current,
    }: {
      input: SaveBOMPerformanceVersionOptionInput
      current?: BOMPerformanceVersionOption
    }) =>
      BOMPerformanceVersionOptionService.savePerformanceVersionOption(
        input,
        current
      ),
    onSuccess: async (savedOption) => {
      await queryClient.cancelQueries({
        queryKey: BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY,
      })
      queryClient.setQueryData<BOMPerformanceVersionOption[]>(
        BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY,
        (options) =>
          [
            ...(options ?? []).filter((option) => option.id !== savedOption.id),
            savedOption,
          ].sort((left, right) => left.sortOrder - right.sortOrder)
      )
      await refreshBOMPerformanceVersionOptionDisplays()
    },
  })

  const deleteOptionMutation = useMutation({
    mutationFn:
      BOMPerformanceVersionOptionService.deletePerformanceVersionOption,
    onSuccess: async (_response, deletedOption) => {
      await queryClient.cancelQueries({
        queryKey: BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY,
      })
      queryClient.setQueryData<BOMPerformanceVersionOption[]>(
        BOM_PERFORMANCE_VERSION_OPTIONS_QUERY_KEY,
        (options) => options?.filter((option) => option.id !== deletedOption.id)
      )
      await refreshBOMPerformanceVersionOptionDisplays()
    },
  })

  return {
    options: optionsQuery.data ?? EMPTY_BOM_PERFORMANCE_VERSION_OPTIONS,
    isLoading: optionsQuery.isPending,
    error: optionsQuery.error,
    retry: optionsQuery.refetch,
    saveOption: (
      input: SaveBOMPerformanceVersionOptionInput,
      current?: BOMPerformanceVersionOption
    ) => saveOptionMutation.mutateAsync({ input, current }),
    deleteOption: deleteOptionMutation.mutateAsync,
    isSavingOption: saveOptionMutation.isPending,
    isDeletingOption: deleteOptionMutation.isPending,
  }
}
