'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type Furnace, type FurnaceStatus } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * FurnaceService - 专门负责炉台资产的数据模型与业务逻辑 (已同步至后端)
 */
export class FurnaceService {
    /**
     * 获取所有炉台
     */
    static async getFurnaces(): Promise<Furnace[]> {
        const res = await apiFetch<Furnace[]>('/furnaces')
        return ensureArrayResponse<Furnace>(res, 'FurnaceService.getFurnaces')
    }

    /**
     * 保存炉台信息 (单个或批量)
     */
    static async saveFurnace(furnace: Partial<Furnace>): Promise<Furnace> {
        const res = await apiFetch<Furnace>('/furnaces', {
            method: 'POST',
            body: JSON.stringify(furnace)
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
        return ensureObjectResponse<Furnace>(res, 'FurnaceService.saveFurnace')
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
     * 局部更新炉台信息 (SDRTS 结构化差量更新)
     */
    static async patchFurnace(furnaceId: string, delta: DeltaSet, version?: number): Promise<Furnace> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id: furnaceId, version }
        }

        const res = await apiFetch<Furnace>(`/furnaces/${furnaceId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        window.dispatchEvent(new CustomEvent('xdfc_furnaces_updated'))
        return ensureObjectResponse<Furnace>(res, 'FurnaceService.patchFurnace')
    }
}
