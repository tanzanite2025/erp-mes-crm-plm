import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { handleServerError } from '@/lib/handle-server-error'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import { useLanguage } from '@/context/language-provider'
import type { Standard } from '../data/schema'
import {
  QualityCoreService,
  type QualityStandardsResponse,
  type QualityTasksResponse,
  type QualityAbnormality,
  type QualityTask,
} from '../services/quality-core-service'
import {
  QualityMaintenanceService,
  type ExecuteInspectionPayload,
  type RecordQualityAbnormalityDisposalPayload,
} from '../services/quality-maintenance-service'
import type { GetQualityStandardsParams } from '../types/quality-standards-list'

// Re-export types for backward compatibility in components
export type {
  QualityStandardsResponse,
  QualityTasksResponse,
  QualityAbnormality,
  ExecuteInspectionPayload,
  RecordQualityAbnormalityDisposalPayload,
  QualityTask,
}

export function useGetQualityStandards(params: GetQualityStandardsParams) {
  return useQuery({
    queryKey: ['quality_standards', params],
    queryFn: () => QualityCoreService.getStandards(params),
  })
}

export function useGetQualityStandard(id: string) {
  return useQuery({
    queryKey: ['quality_standard', id],
    queryFn: () => QualityCoreService.getStandardById(id),
    enabled: !!id,
  })
}

export function useGetQualityTasks(
  page: number,
  pageSize: number,
  batchNo?: string
) {
  return useQuery({
    queryKey: ['quality_tasks', page, pageSize, batchNo],
    queryFn: () => QualityCoreService.getTasks(page, pageSize, batchNo),
  })
}

export function useGetAbnormalities() {
  return useQuery({
    queryKey: ['quality_abnormalities'],
    queryFn: () => QualityCoreService.getAbnormalities(),
  })
}

export function useGetInspectionStats() {
  return useQuery({
    queryKey: ['quality_inspection_stats'],
    queryFn: () => QualityCoreService.getInspectionStats(),
  })
}

export function useQualityMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const saveStandardMutation = useMutation({
    mutationFn: (params: {
      data: Partial<Standard>
      isPatch?: boolean
      delta?: DeltaSet
      successMessage?: string
    }) => QualityMaintenanceService.saveStandard(params),
    ...buildMutationOptions<
      Standard,
      Error,
      {
        data: Partial<Standard>
        isPatch?: boolean
        delta?: DeltaSet
        successMessage?: string
      }
    >({
      queryClient,
      invalidateQueryKeys: [['quality_standards'], ['quality_standard']],
      onError: handleServerError,
      onSuccess: (_, variables) => {
        toast.success(
          variables.successMessage || t('quality.hooks.saveStandardSuccess')
        )
      },
    }),
  })

  const executeInspectionMutation = useMutation({
    mutationFn: (data: ExecuteInspectionPayload) =>
      QualityMaintenanceService.executeInspection(data),
    ...buildMutationOptions<void, Error, ExecuteInspectionPayload>({
      queryClient,
      invalidateQueryKeys: [
        ['quality_tasks'],
        ['quality_abnormalities'],
        ['quality_inspection_stats'],
      ],
      onError: handleServerError,
      onSuccess: () => {
        toast.success(t('quality.inspection.toast.submitted'))
      },
    }),
  })

  const recordAbnormalityDisposalMutation = useMutation({
    mutationFn: (params: {
      id: string
      data: RecordQualityAbnormalityDisposalPayload
    }) =>
      QualityMaintenanceService.recordAbnormalityDisposal(
        params.id,
        params.data
      ),
    ...buildMutationOptions<
      unknown,
      Error,
      {
        id: string
        data: RecordQualityAbnormalityDisposalPayload
      }
    >({
      queryClient,
      invalidateQueryKeys: [['quality_abnormalities']],
      onError: handleServerError,
      onSuccess: () => {
        toast.success(t('quality.hooks.saveAbnormalityDisposalSuccess'))
      },
    }),
  })

  return {
    saveStandardMutation,
    executeInspectionMutation,
    recordAbnormalityDisposalMutation,
  }
}
