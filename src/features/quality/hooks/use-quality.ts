import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { useLanguage } from '@/context/language-provider'
import { buildMutationOptions } from '@/lib/react-query-mutation'
import type { Standard } from '../data/schema'

export interface QualityStandardsResponse {
    items: Standard[]
    total: number
}

export interface QualityTask {
    id: string
    batchNo: string
    productName?: string
    result: 'PENDING' | 'PASS' | 'FAIL'
    inspector?: string
    remarks?: string
}

export interface QualityTasksResponse {
    items: QualityTask[]
    total: number
}

export interface QualityAbnormality {
    id: string
    description: string
    severity: 'CRITICAL' | 'MAJOR' | 'HIGH' | 'MEDIUM' | 'MINOR' | 'LOW'
    status: 'OPEN' | 'CLOSED' | 'REJECTED'
    disposalMethod?: string
}

export interface ExecuteInspectionPayload {
    id: string
    result: 'PASS' | 'FAIL'
    remarks?: string
}

export function useGetQualityStandards(page: number, pageSize: number, type?: string) {
    return useQuery({
        queryKey: ['quality_standards', page, pageSize, type],
        queryFn: () => apiFetch<QualityStandardsResponse>(`/quality/standards?page=${page}&pageSize=${pageSize}&type=${type || 'ALL'}`),
    })
}

export function useGetQualityTasks(page: number, pageSize: number, batchNo?: string) {
    return useQuery({
        queryKey: ['quality_tasks', page, pageSize, batchNo],
        queryFn: () => apiFetch<QualityTasksResponse>(`/quality/tasks?page=${page}&pageSize=${pageSize}&batchNo=${batchNo || ''}`),
    })
}

export function useGetAbnormalities() {
    return useQuery({
        queryKey: ['quality_abnormalities'],
        queryFn: () => apiFetch<QualityAbnormality[]>('/quality/abnormalities'),
    })
}

export function useQualityMutations() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    const saveStandardMutation = useMutation({
        mutationFn: (data: Partial<Standard>) => apiFetch('/quality/standards', { method: 'POST', body: JSON.stringify(data) }),
        ...buildMutationOptions<unknown, unknown, Partial<Standard>>({
            queryClient,
            invalidateQueryKeys: [['quality_standards']],
            successMessage: t('quality.hooks.saveStandardSuccess'),
        }),
    })

    const executeInspectionMutation = useMutation({
        mutationFn: (data: ExecuteInspectionPayload) => apiFetch('/quality/tasks', { method: 'POST', body: JSON.stringify(data) }),
        ...buildMutationOptions<unknown, unknown, ExecuteInspectionPayload>({
            queryClient,
            invalidateQueryKeys: [['quality_tasks'], ['quality_abnormalities']],
            successMessage: t('quality.inspection.toast.submitted'),
        }),
    })

    return { saveStandardMutation, executeInspectionMutation }
}
