'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type Mold, type MoldStatus } from '../data/schema'
import { MoldCoreService, VALID_MOLD_STATUS_TRANSITIONS } from './mold-core-service'

export interface MoldCapacityInstance {
    sn: string
    health: number
    status: MoldStatus
}

export interface MoldCapacityCheckResult extends Record<string, unknown> {
    isSufficient: boolean
    totalRemaining: number
    shortage: number
    instances: MoldCapacityInstance[]
}

/**
 * MoldTransactionService - 模具事务管理服务
 * 职责: 处理有明确业务意义的状态流转、资产归档及遥测同步。
 */
export const MoldTransactionService = {
    /**
     * 创建模具资产 (TDO: ASSET_INITIAL_REGISTRATION)
     */
    async createMold(mold: Omit<Mold, 'id' | 'version' | 'status'>): Promise<Mold> {
        const result = await apiFetch<Mold>('/molds', {
            method: 'POST',
            body: JSON.stringify({
                ...mold,
                status: 'IDLE',
                metadata: { intent: 'ASSET_INITIAL_REGISTRATION' }
            })
        })
        return ensureObjectResponse<Mold>(result, 'MoldTransactionService.createMold')
    },

    /**
     * 变更状态 (TDO: Lifecycle Transitions)
     */
    async changeStatus(moldId: string, newStatus: MoldStatus, reason?: string): Promise<void> {
        const mold = await MoldCoreService.getMoldById(moldId)
        const oldStatus = mold.status
        if (oldStatus === newStatus) return

        const allowed = VALID_MOLD_STATUS_TRANSITIONS[oldStatus] || []
        if (!allowed.includes(newStatus)) {
            throw new Error(`[STATUS_GUARD] 非法状态跳转: ${mold.sn} [${oldStatus}] -> [${newStatus}]`)
        }

        await apiFetch(`/molds/${moldId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ 
                status: newStatus, 
                reason,
                metadata: { 
                    intent: `STATUS_TRANSITION_${newStatus}`,
                    previousStatus: oldStatus
                }
            })
        })
    },

    /**
     * 更新遥测数据 (TDO: TELEMETRY_SYNC)
     */
    async updateTelemetry(moldId: string, cycles: number): Promise<void> {
        await apiFetch(`/molds/${moldId}/telemetry`, {
            method: 'POST',
            body: JSON.stringify({ 
                cycles,
                metadata: { intent: 'TELEMETRY_SYNC' }
            })
        })
    },

    /**
     * 归档资产 (TDO: ASSET_ARCHIVE)
     */
    async archiveMold(moldId: string, reason: string): Promise<void> {
        await apiFetch(`/molds/${moldId}/archive`, {
            method: 'POST',
            body: JSON.stringify({ 
                reason,
                metadata: { intent: 'ASSET_ARCHIVE' }
            })
        })
    },

    /**
     * 检查模具产能 (业务逻辑查询)
     * [REFACTORED]: 核心资产算法已迁移至 Go 后端。
     */
    async checkMoldCapacity(groupName: string, requestedQty: number): Promise<MoldCapacityCheckResult> {
        // [BACKEND-AUTHORITY] 调用后端业务逻辑接口，获取计算后的产能模型
        const res = await apiFetch<MoldCapacityCheckResult>(`/molds/capacity?groupName=${encodeURIComponent(groupName)}&requestedQty=${requestedQty}`)
        return ensureObjectResponse<MoldCapacityCheckResult>(res, 'MoldTransactionService.checkMoldCapacity')
    }
}
