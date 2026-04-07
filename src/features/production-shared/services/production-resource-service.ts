import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import type { ProcessStep } from '../tabs/work-architecture/components/process-utils'
import type { ProductionLine } from '../tabs/line-mgmt/types'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

type SaveLinePayload = ProductionLine & {
    authCode?: string
}

type ProcessCapabilityMapping = Record<string, string[]>
type ProcessCapabilityMutationPayload = {
    stationId: string
    processId: string
}

export const productionResourceService = {
    // --- 产线相关 ---
    getLines: async (): Promise<ProductionLine[]> => {
        const res = await apiFetch<ProductionLine[]>('/production/lines')
        return ensureArrayResponse<ProductionLine>(res, 'productionResourceService.getLines')
    },

    saveLine: async (line: ProductionLine, authCode?: string): Promise<ProductionLine> => {
        const payload: SaveLinePayload = authCode ? { ...line, authCode } : line
        return apiFetch<ProductionLine>('/production/lines', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    },

    /**
     * 局部更新产线信息 (SDRTS 结构化差量更新)
     */
    patchLine: async (id: string, delta: DeltaSet, version: number, authCode?: string): Promise<ProductionLine> => {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id, 
                version,
                // 将 authCode 注入 metadata 以保证审计与安全校验一致性
                authCode 
            }
        }

        return apiFetch<ProductionLine>(`/production/lines/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
    },

    deleteLine: async (id: string): Promise<void> => {
        return apiFetch(`/production/lines/${id}`, {
            method: 'DELETE'
        })
    },

    // --- 工序相关 ---
    getSteps: async (): Promise<ProcessStep[]> => {
        return apiFetch<ProcessStep[]>('/production/processes')
    },

    saveStep: async (step: ProcessStep): Promise<ProcessStep> => {
        return apiFetch<ProcessStep>('/production/processes', {
            method: 'POST',
            body: JSON.stringify(step)
        })
    },

    deleteStep: async (id: string): Promise<void> => {
        return apiFetch(`/production/processes/${id}`, {
            method: 'DELETE'
        })
    },

    // --- 工序能力映射子域 ---
    getProcessCapabilityMappings: async (): Promise<ProcessCapabilityMapping> => {
        return apiFetch<ProcessCapabilityMapping>('/production/mappings')
    },

    assignProcessCapability: async (nodeId: string, processId: string): Promise<void> => {
        const payload: ProcessCapabilityMutationPayload = { stationId: nodeId, processId }
        return apiFetch('/production/mappings/assign', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    },

    removeProcessCapability: async (nodeId: string, processId: string): Promise<void> => {
        const payload: ProcessCapabilityMutationPayload = { stationId: nodeId, processId }
        return apiFetch('/production/mappings/remove', {
            method: 'POST',
            body: JSON.stringify(payload)
        })
    }
}
