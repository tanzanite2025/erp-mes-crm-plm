import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse, ensureArrayResponse } from '@/lib/api-response'
import type { Standard } from '../data/schema'

export type QualityStandardsResponse = {
    items: Standard[]
    total: number
    [key: string]: unknown
}

export interface QualityTask {
    id: string
    batchNo: string
    productName?: string
    result: 'PENDING' | 'PASS' | 'FAIL'
    inspector?: string
    remarks?: string
}

export type QualityTasksResponse = {
    items: QualityTask[]
    total: number
    [key: string]: unknown
}

export interface QualityAbnormality {
    id: string
    description: string
    severity: 'CRITICAL' | 'MAJOR' | 'HIGH' | 'MEDIUM' | 'MINOR' | 'LOW'
    status: 'OPEN' | 'CLOSED' | 'REJECTED'
    disposalMethod?: string
}

/**
 * QualityCoreService - 专门负责质量模块的只读查询逻辑 (Logic-Hook-UI)情况情况总量。
 */
export const QualityCoreService = {
    /**
     * 分页查询质量标准
     */
    getStandards: async (page: number, pageSize: number, type?: string): Promise<QualityStandardsResponse> => {
        const res = await apiFetch<QualityStandardsResponse>(`/quality/standards?page=${page}&pageSize=${pageSize}&type=${type || 'ALL'}`)
        return ensureObjectResponse<QualityStandardsResponse>(res, 'QualityCoreService.getStandards')
    },

    /**
     * 分页查询检测任务
     */
    getTasks: async (page: number, pageSize: number, batchNo?: string): Promise<QualityTasksResponse> => {
        const res = await apiFetch<QualityTasksResponse>(`/quality/tasks?page=${page}&pageSize=${pageSize}&batchNo=${batchNo || ''}`)
        return ensureObjectResponse<QualityTasksResponse>(res, 'QualityCoreService.getTasks')
    },

    /**
     * 查询异常记录
     */
    getAbnormalities: async (): Promise<QualityAbnormality[]> => {
        const res = await apiFetch<QualityAbnormality[]>('/quality/abnormalities')
        return ensureArrayResponse<QualityAbnormality>(res, 'QualityCoreService.getAbnormalities')
    },

    /**
     * 获取质量检测指标概览 (权威汇总)
     */
    getInspectionStats: async (): Promise<{ pendingCount: number, passCount: number, failCount: number }> => {
        const res = await apiFetch<{ pendingCount: number, passCount: number, failCount: number }>('/quality/stats')
        return ensureObjectResponse<{ pendingCount: number, passCount: number, failCount: number }>(res, 'QualityCoreService.getInspectionStats')
    }
}
