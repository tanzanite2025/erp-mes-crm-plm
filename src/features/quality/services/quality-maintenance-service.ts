import { apiFetch } from '@/lib/api-client'
import type { Standard } from '../data/schema'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'

export interface ExecuteInspectionPayload {
    id: string
    remarks?: string
}

/**
 * QualityMaintenanceService - 专门负责质量模块的维护与写入逻辑 (SDRTS 协议封装)情况情况总量。
 */
export const QualityMaintenanceService = {
    /**
     * 保存质量标准 (支持创建与 SDRTS Patch)
     */
    saveStandard: async (params: { data: Partial<Standard>; isPatch?: boolean; delta?: DeltaSet }): Promise<void> => {
        const { data, isPatch, delta } = params
        
        if (isPatch && data.id && delta) {
            const payload: DeltaPayload = {
                op: 'PATCH',
                delta,
                metadata: { id: data.id, version: (data as Standard).version }
            }
            await apiFetch(`/quality/standards/${data.id}`, { 
                method: 'PATCH', 
                body: JSON.stringify(payload) 
            })
            return
        }

        // 全量提交 (Create)
        await apiFetch('/quality/standards', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        })
    },

    /**
     * 执行质量检测任务
     */
    executeInspection: async (data: ExecuteInspectionPayload): Promise<void> => {
        await apiFetch('/quality/tasks', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        })
    }
}
