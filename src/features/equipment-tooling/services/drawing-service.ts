'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type MoldDrawing, type MoldDrawingLog } from '../data/schema'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'

/**
 * DrawingService - 专门负责模具技术图纸的管理 (已同步至后端)
 */
export const DrawingService = {
    async getDrawings(): Promise<MoldDrawing[]> {
        const data = await apiFetch<MoldDrawing[]>('/drawings')
        if (!data) throw new Error('[CRITICAL] 未能获取技术图纸数据')
        return data
    },

    async saveDrawings(drawings: MoldDrawing[]): Promise<void> {
        // 通常批量保存建议由后端处理，此处为保持兼容性保留接口
        await apiFetch('/drawings/batch', {
            method: 'POST',
            body: JSON.stringify(drawings)
        })
        window.dispatchEvent(new CustomEvent('xdfc_drawings_updated'))
    },

    async getDrawingLogs(drawingId: string): Promise<MoldDrawingLog[]> {
        const logs = await apiFetch<MoldDrawingLog[]>(`/drawings/${drawingId}/logs`)
        if (!logs) throw new Error(`[CRITICAL] 获取图纸 ${drawingId} 的审计日志失败`)
        return logs
    },

    async addLog(log: Omit<MoldDrawingLog, 'id' | 'timestamp'>): Promise<void> {
        await apiFetch(`/drawings/${log.drawingId}/logs`, {
            method: 'POST',
            body: JSON.stringify(log)
        })
    },

    async addDrawing(drawing: Omit<MoldDrawing, 'id' | 'uploadedAt'>): Promise<MoldDrawing> {
        const result = await apiFetch<MoldDrawing>('/drawings', {
            method: 'POST',
            body: JSON.stringify(drawing)
        })

        if (!result) {
            throw new Error('[CRITICAL_DATA_PATH] Create drawing failed, returned no data.')
        }
        
        // 自动注入日志
        await this.addLog({
            drawingId: result.id,
            action: 'CREATED',
            details: `技术归档创建。${result.moldSn ? `初始绑定至模具: ${result.moldSn}` : '未关联特定模具'}`,
            operator: '系统管理员'
        })
        
        window.dispatchEvent(new CustomEvent('xdfc_drawings_updated'))
        return ensureObjectResponse<MoldDrawing>(result, 'DrawingService.addDrawing')
    },

    /**
     * 局部更新图纸信息 (SDRTS 结构化差量更新)
     */
    async patchDrawing(id: string, delta: DeltaSet, sysVersion: number): Promise<MoldDrawing> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version: sysVersion }
        }

        const res = await apiFetch<MoldDrawing>(`/drawings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })

        if (!res) {
            throw new Error(`[CRITICAL_DATA_PATH] Patch drawing ${id} failed, returned no data.`)
        }

        // 推理操作类型以注入更精准的日志 (前端模拟后端审计逻辑)
        let action: MoldDrawingLog['action'] = 'STATUS_CHANGE'
        if (delta.moldSn) {
            action = delta.moldSn.n ? 'BIND' : 'UNBIND'
        } else if (delta.version) {
            action = 'VERSION_UPDATE'
        }

        await this.addLog({
            drawingId: id,
            action,
            details: `技术变更: ${Object.keys(delta).join(', ')}`,
            delta,
            operator: '系统管理员'
        })

        window.dispatchEvent(new CustomEvent('xdfc_drawings_updated'))
        return ensureObjectResponse<MoldDrawing>(res, 'DrawingService.patchDrawing')
    },

    async updateDrawing(id: string, updates: Partial<MoldDrawing>): Promise<void> {
        await apiFetch(`/drawings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates)
        })

        window.dispatchEvent(new CustomEvent('xdfc_drawings_updated'))
    },

    async deleteDrawing(id: string): Promise<void> {
        await apiFetch(`/drawings/${id}`, {
            method: 'DELETE'
        })
        window.dispatchEvent(new CustomEvent('xdfc_drawings_updated'))
    },

    async getDrawingsByMold(moldSn: string): Promise<MoldDrawing[]> {
        const response = await apiFetch<MoldDrawing[]>(`/drawings/by-mold/${moldSn}`)
        if (!response) throw new Error(`[CRITICAL] 按模具编号 ${moldSn} 查询图纸结果为空 (预期至少为长度为0的数组)`)
        return response
    }
}
