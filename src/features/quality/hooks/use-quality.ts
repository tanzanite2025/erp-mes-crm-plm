import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { handleServerError } from '@/lib/handle-server-error'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import type { Standard } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'
import { QualityCoreService, type QualityStandardsResponse, type QualityTasksResponse, type QualityAbnormality, type QualityTask } from '../services/quality-core-service'
import { QualityMaintenanceService, type ExecuteInspectionPayload } from '../services/quality-maintenance-service'

// Re-export types for backward compatibility in components
export type { QualityStandardsResponse, QualityTasksResponse, QualityAbnormality, ExecuteInspectionPayload, QualityTask }

export function useGetQualityStandards(page: number, pageSize: number, type?: string) {
    return useQuery({
        queryKey: ['quality_standards', page, pageSize, type],
        queryFn: () => QualityCoreService.getStandards(page, pageSize, type),
    })
}

export function useGetQualityTasks(page: number, pageSize: number, batchNo?: string) {
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
        mutationFn: (params: { data: Partial<Standard>; isPatch?: boolean; delta?: DeltaSet }) => 
            QualityMaintenanceService.saveStandard(params),
        ...buildMutationOptions<void, Error, { data: Partial<Standard>; isPatch?: boolean; delta?: DeltaSet }>({
            queryClient,
            invalidateQueryKeys: [['quality_standards']],
            onError: handleServerError,
            onSuccess: () => {
                toast.success(t('quality.hooks.saveStandardSuccess'))
            },
        }),
    })

    const executeInspectionMutation = useMutation({
        mutationFn: (data: ExecuteInspectionPayload) => 
            QualityMaintenanceService.executeInspection(data),
        ...buildMutationOptions<void, Error, ExecuteInspectionPayload>({
            queryClient,
            invalidateQueryKeys: [['quality_tasks'], ['quality_abnormalities']],
            onError: handleServerError,
            onSuccess: () => {
                toast.success(t('quality.inspection.toast.submitted'))
            },
        }),
    })

    return { saveStandardMutation, executeInspectionMutation }
}
