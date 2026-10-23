import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeltaSet } from '@/lib/delta/types'
import type { TechnicalSpec } from '../data/schema'
import { ENGINEERING_DB_SPECS_QUERY_KEY } from '../query-keys'
import { SpecsService } from '../services/specs-service'

export interface TechnicalSpecificationDocumentSaveParameters {
  data: TechnicalSpec
  isPatch: boolean
  delta?: DeltaSet
  version?: number
}

export function useTechnicalSpecificationDocumentWriteActions() {
  const queryClient = useQueryClient()
  const saveMutation = useMutation({
    mutationFn: async (
      parameters: TechnicalSpecificationDocumentSaveParameters
    ) => {
      if (parameters.isPatch) {
        if (!parameters.delta || !parameters.version) {
          throw new Error('技术规范修改缺少变更内容或版本，请重新打开文档')
        }
        return SpecsService.patchSpec(
          parameters.data.id,
          parameters.delta,
          parameters.version
        )
      }
      return SpecsService.saveSpec(parameters.data)
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData<TechnicalSpec[]>(
        ENGINEERING_DB_SPECS_QUERY_KEY,
        (previous) =>
          previous
            ? [...previous.filter((item) => item.id !== saved.id), saved]
            : undefined
      )
      await queryClient.invalidateQueries({
        queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
      })
    },
  })
  return {
    saveTechnicalSpecificationDocument: saveMutation.mutateAsync,
    isSavingTechnicalSpecificationDocument: saveMutation.isPending,
  }
}
