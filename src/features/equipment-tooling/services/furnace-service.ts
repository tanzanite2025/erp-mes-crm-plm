'use client'

import { apiFetch } from '@/lib/api-client'
import { type Furnace, type FurnaceStatus } from '../data/schema'

/**
 * FurnaceService - 专门负责炉台资产的数据模型与业务逻辑 (已同步至后端)
 */
export class FurnaceService {
    /**
     * 获取所有炉台
     */
    static async getFurnaces(): Promise<Furnace[]> {
        const data = await apiFetch<Furnace[]>('/furnaces')
        if (!data) throw new Error('[CRITICAL] 未能从后端获取炉台配置数据')
        return data
    }

    /**
     * 保存炉台信息 (单个或批量)
     */
    static async saveFurnace(furnace: Partial<Furnace>) {
        await apiFetch('/furnaces', {
            method: 'POST',
            body: JSON.stringify(furnace)
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
    }

    /**
     * 批量保存炉台列表
     */
    static async saveFurnaces(furnaces: Furnace[]) {
        await apiFetch('/furnaces/batch', {
            method: 'POST',
            body: JSON.stringify(furnaces)
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
    }

    /**
     * 更新炉台遥测数据
     */
    static async updateTelemetry(furnaceId: string, temp: number) {
        await apiFetch(`/furnaces/${furnaceId}/telemetry`, {
            method: 'POST',
            body: JSON.stringify({ temp })
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
    }

    /**
     * 设置炉台状态
     */
    static async setStatus(id: string, status: FurnaceStatus) {
        await apiFetch(`/furnaces/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
    }

    /**
     * 局部更新炉台信息 (差分更新 - 解决性能开销风险)
     */
    static async patchFurnace(furnaceId: string, updates: Partial<Furnace>): Promise<void> {
        await apiFetch(`/furnaces/${furnaceId}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
    }
}
