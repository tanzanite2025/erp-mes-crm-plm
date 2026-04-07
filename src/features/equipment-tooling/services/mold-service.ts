'use client'

import { apiFetch } from '@/lib/api-client'
import { type Mold, type MoldStatus } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * 模具状态流转合法性映射表
 */
export const VALID_MOLD_STATUS_TRANSITIONS: Record<MoldStatus, MoldStatus[]> = {
    'IDLE': ['IN_USE', 'MAINTENANCE', 'LENT_OUT', 'RETIRED', 'CHECKING'],
    'IN_USE': ['IDLE', 'CHECKING', 'MAINTENANCE', 'RETIRED'],
    'CHECKING': ['IDLE', 'MAINTENANCE', 'RETIRED', 'IN_USE'],
    'MAINTENANCE': ['IDLE', 'CHECKING', 'RETIRED'],
    'LENT_OUT': ['IDLE', 'CHECKING'], 
    'BORROWED': ['IDLE', 'RETIRED', 'CHECKING'],
    'RETIRED': [] 
}

/**
 * MoldService - 专门负责模具资产的数据模型与业务逻辑 (已同步至后端)
 */
export class MoldService {
    /**
     * 获取所有模具及其版本信息
     */
    static async getMoldsWithVersion(): Promise<{ molds: Mold[], version: number }> {
        // 后端接口应返回 { data: Mold[], version: number } 结构
        const response = await apiFetch<{ data: Mold[], version: number }>('/molds')
        
        // 兼容处理：如果 apiFetch 触发了分页包装，response 本身就是一个数组
        const rawData = (response as any).data || response
        const version = (response as any).version || 0

        if (!Array.isArray(rawData)) {
            throw new Error(`[CRITICAL] 后端返回模具数据格式错误或数据偏移: ${JSON.stringify(response)}`)
        }
        
        const molds = rawData.map((m: any) => ({
            ...m,
            totalLifeCycles: m.totalLifeCycles || m.currentCycles || 0,
            status: m.status || 'IDLE',
            isAlerted: m.isAlerted ?? false,
            createdAt: m.createdAt || new Date().toISOString()
        }))

        return { molds, version }
    }

    /**
     * 获取所有模具
     */
    static async getMolds(): Promise<Mold[]> {
        const { molds } = await this.getMoldsWithVersion()
        return molds
    }

    /**
     * 获取单个模具详情
     */
    static async getMoldById(id: string): Promise<Mold> {
        return apiFetch<Mold>(`/molds/${id}`)
    }

    /**
     * 获取所有唯一的模具分组名称
     */
    static async getGroupNames(): Promise<string[]> {
        const molds = await this.getMolds()
        const groups = molds.map(m => m.groupName).filter(Boolean) as string[]
        return Array.from(new Set(groups))
    }

    /**
     * 保存模具信息 (创建或更新)
     */
    static async saveMold(mold: Partial<Mold>): Promise<Mold> {
        const result = await apiFetch<Mold>('/molds', {
            method: 'POST',
            body: JSON.stringify(mold)
        })
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        return result
    }

    /**
     * 局部更新模具信息 (SDRTS 结构化差量更新)
     */
    static async patchMold(moldId: string, delta: DeltaSet, version?: number): Promise<void> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id: moldId, version }
        }

        await apiFetch(`/molds/${moldId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
    }

    /**
     * 基于追踪器的自动差量保存
     */
    static async saveWithDelta(moldId: string, original: Mold, current: Mold): Promise<void> {
        // 此处逻辑未来将由 BaseApiService 统一处理
        const { trackDelta } = await import('@/lib/delta/proxy-tracker')
        const tracker = trackDelta(original)
        
        // 模拟变更应用（实际开发中应在 UI 层直接操作 tracker.data）
        Object.assign(tracker.data, current)
        
        const delta = tracker.commit()
        if (Object.keys(delta).length > 0) {
            await this.patchMold(moldId, delta, original.version)
        }
    }

    /**
     * 批量保存模具列表 (已迁移至后端处理)
     */
    static async saveMolds(molds: Mold[]) {
        // 后端应支持批量保存接口
        await apiFetch('/molds/batch', {
            method: 'POST',
            body: JSON.stringify(molds)
        })
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
    }

    /**
     * 变更模具状态 (包含合法性校验与审计)
     */
    static async changeStatus(moldId: string, newStatus: MoldStatus, reason?: string) {
        // 1. 获取当前状态进行前端预校验 (可选，后端也会校验)
        const mold = await this.getMoldById(moldId)
        const oldStatus = mold.status
        if (oldStatus === newStatus) return

        const allowed = VALID_MOLD_STATUS_TRANSITIONS[oldStatus] || []
        if (!allowed.includes(newStatus)) {
            throw new Error(`[STATUS_GUARD] 非法状态跳转：资产 ${mold.sn} 无法从 [${oldStatus}] 切换至 [${newStatus}]`)
        }

        // 2. 调用后端状态变更接口 (带审计原因)
        await apiFetch(`/molds/${moldId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus, reason })
        })

        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        console.log(`[STATUS_CHANGE] Mold ${mold.sn}: ${oldStatus} -> ${newStatus}. Reason: ${reason || 'Manual Update'}`)
    }

    /**
     * 检查模具产能 (按分组名称)
     */
    static async checkMoldCapacity(groupName: string, requestedQty: number) {
        // 此逻辑建议在后端实现以保证准确性，此处保留前端计算作为 UI 即时反馈
        const allMolds = await this.getMolds()
        const targetMolds = allMolds.filter(m => m.groupName === groupName && m.status !== 'RETIRED')
        
        const instances = targetMolds.map(m => ({
            id: m.id,
            sn: m.sn,
            remaining: Math.max(0, m.maxCycles - (m.currentCycles || 0)),
            health: Math.round(((m.maxCycles - (m.currentCycles || 0)) / m.maxCycles) * 100),
            status: m.status
        }))

        const totalRemaining = instances.reduce((sum, inst) => sum + inst.remaining, 0)
        
        return {
            isSufficient: totalRemaining >= requestedQty,
            totalRemaining,
            instances,
            shortage: Math.max(0, requestedQty - totalRemaining)
        }
    }

    /**
     * 更新模具遥测数据 (对接后端数据采集接口)
     */
    static async updateTelemetry(moldId: string, cycles: number) {
        try {
            await apiFetch(`/molds/${moldId}/telemetry`, {
                method: 'POST',
                body: JSON.stringify({ cycles })
            })
            window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        } catch (err) {
            console.error(`[TELEMETRY] Error updating mold ${moldId}`, err)
            throw err
        }
    }

    /**
     * 检查模具编号是否重复
     */
    static async isSnDuplicate(sn: string, excludeId?: string): Promise<boolean> {
        // 后端应提供验证接口
        const response = await apiFetch<{ duplicate: boolean }>(`/molds/check-sn?sn=${sn}&excludeId=${excludeId || ''}`)
        return response.duplicate
    }

    /**
     * 归档模具资产档案 (非破坏性移除)
     * 将实物档案移出活跃库并存入技术遗产库
     */
    static async archiveMold(moldId: string, reason: string): Promise<void> {
        // 1. 调用后端归档接口
        await apiFetch(`/molds/${moldId}/archive`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        })

        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        console.log(`[DATA_PRESERVE] 模具 ID: ${moldId} 实物档案已进入“技术档案库”存档。原因: ${reason}`)
    }

    /**
     * 【审计加固】检查数据链路完整性
     */
    static async checkLinkIntegrity() {
        // 此逻辑涉及跨模块，建议由后端聚合接口提供
        const response = await apiFetch<{ 
            totalProducts: number, 
            orphanProducts: { sku: string, missingGroup: string }[],
            isHealthy: boolean 
        }>('/molds/integrity-check')
        
        return response
    }
}
