import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { type EquipmentCategory, type Equipment } from '../data/schema'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'

type LabExperimentalTaskRecord = {
    id: string
    code?: string
    sampleId?: string
    name?: string
    executor?: string
    scheduledAt?: string
    status?: string
}

type LabExperimentalTaskQueryResult = {
    items?: LabExperimentalTaskRecord[]
}

type LabExperimentalReportRecord = {
    id: string
    createdAt: string
    conclusion: string
    approvedBy?: string
    result?: string
    task?: {
        code?: string
    }
}

type LabExperimentalTaskMutationInput = {
    id: string
    status?: string
} & Record<string, unknown>

type LabExperimentalReportMutationInput = Record<string, unknown>

// --- 设备与分类 ---

export function useLabExperimentalCategories() {
    return useQuery<EquipmentCategory[]>({
        queryKey: ['exp_categories'],
        queryFn: () => apiFetch('/labs/experimental/categories')
    })
}

export function useLabExperimentalEquipment(categoryId?: string) {
    return useQuery<Equipment[]>({
        queryKey: ['exp_equipment', categoryId],
        queryFn: () => apiFetch(`/labs/experimental/equipment?categoryId=${categoryId || ''}`)
    })
}

// --- 实验项目与报告 ---

export function useLabExperimentalTasks(page: number, pageSize: number, type?: string) {
    return useQuery<LabExperimentalTaskQueryResult>({
        queryKey: ['exp_tasks', page, pageSize, type],
        queryFn: () => apiFetch(`/labs/experimental/tasks?page=${page}&pageSize=${pageSize}&type=${type || 'ALL'}`)
    })
}

export function useLabExperimentalReports() {
    return useQuery<LabExperimentalReportRecord[]>({
        queryKey: ['exp_reports'],
        queryFn: () => apiFetch('/labs/experimental/reports')
    })
}

// --- Mutations ---

export function useLabExperimentalMutations() {
    const { t } = useLanguage()
    const queryClient = useQueryClient()

    const saveCategoryMutation = useMutation({
        mutationFn: (data: Partial<EquipmentCategory>) => apiFetch('/labs/experimental/categories', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_categories'] })
            toast.success(t('labExperimental.toasts.categorySaved'))
        }
    })

    const patchCategoryMutation = useMutation({
        mutationFn: ({ id, delta, version }: { id: string, delta: DeltaSet, version: number }) => {
            const payload: DeltaPayload = {
                op: 'PATCH',
                delta,
                metadata: { id, version }
            };
            return apiFetch(`/labs/experimental/categories/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_categories'] })
            toast.success(t('labExperimental.toasts.categorySaved'))
        }
    })

    const deleteCategoryMutation = useMutation({
        mutationFn: (id: string) => apiFetch(`/labs/experimental/categories/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_categories'] })
            toast.success(t('labExperimental.toasts.categoryDeleted'))
        }
    })

    const saveEquipmentMutation = useMutation({
        mutationFn: (data: Partial<Equipment>) => apiFetch('/labs/experimental/equipment', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_equipment'] })
            toast.success(t('labExperimental.toasts.equipmentSaved'))
        }
    })

    const patchEquipmentMutation = useMutation({
        mutationFn: ({ id, delta, version }: { id: string, delta: DeltaSet, version: number }) => {
            const payload: DeltaPayload = {
                op: 'PATCH',
                delta,
                metadata: { id, version }
            };
            return apiFetch(`/labs/experimental/equipment/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_equipment'] })
            toast.success(t('labExperimental.toasts.equipmentSaved'))
        }
    })

    const deleteEquipmentMutation = useMutation({
        mutationFn: (id: string) => apiFetch(`/labs/experimental/equipment/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_equipment'] })
            toast.success(t('labExperimental.toasts.equipmentDeleted') || '设备已删除')
        }
    })

    const saveTaskMutation = useMutation({
        mutationFn: (data: LabExperimentalTaskMutationInput) => apiFetch('/labs/experimental/tasks', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_tasks'] })
            toast.success(t('labExperimental.toasts.taskSaved'))
        }
    })

    const saveReportMutation = useMutation({
        mutationFn: (data: LabExperimentalReportMutationInput) => apiFetch('/labs/experimental/reports', { method: 'POST', body: JSON.stringify(data) }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['exp_reports'] })
            queryClient.invalidateQueries({ queryKey: ['exp_tasks'] })
            toast.success(t('labExperimental.toasts.reportSaved'))
        }
    })

    return {
        saveCategoryMutation,
        patchCategoryMutation,
        deleteCategoryMutation,
        saveEquipmentMutation,
        patchEquipmentMutation,
        deleteEquipmentMutation,
        saveTaskMutation,
        saveReportMutation
    }
}

// 辅助转换函数：将扁平分类转为树形 (如果后端没处理)
export function buildLabExperimentalCategoryTree(categories: EquipmentCategory[]): EquipmentCategory[] {
    const map = new Map<string, EquipmentCategory>()
    categories.forEach(c => map.set(c.id, { ...c, children: [] }))
    
    const tree: EquipmentCategory[] = []
    map.forEach(c => {
        if (c.parentId && map.has(c.parentId)) {
            map.get(c.parentId)!.children!.push(c)
        } else {
            tree.push(c)
        }
    })
    return tree
}
