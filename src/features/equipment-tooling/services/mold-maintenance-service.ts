'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type Mold } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * MoldMaintenanceService - 模具资产维护与 SDRTS 协议服务
 * 职责: 负责档案物理修正、差量更新逻辑、版本冲突解决。
 */
export const MoldMaintenanceService = {
    /**
     * 局部更新模具信息 (SDRTS 协议: PHYSICAL_ASSET_REPAIR)
     */
    async patchMold(moldId: string, delta: DeltaSet, version: number): Promise<Mold> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id: moldId, 
                version,
                intent: 'PHYSICAL_ASSET_REPAIR'
            }
        }

        const res = await apiFetch<Mold>(`/molds/${moldId}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        return ensureObjectResponse<Mold>(res, 'MoldMaintenanceService.patchMold')
    },

    /**
     * 基于追踪器的自动差量保存 (SDRTS 集成)
     */
    async saveWithDelta(moldId: string, original: Mold, current: Mold): Promise<void> {
        const { trackDelta } = await import('@/lib/delta/proxy-tracker')
        const tracker = trackDelta(original)
        
        Object.assign(tracker.data, current)
        
        const delta = tracker.commit()
        if (Object.keys(delta).length > 0) {
            await this.patchMold(moldId, delta, original.version)
        }
    },

    /**
     * 批量保存/同步模具列表
     */
    async saveMolds(molds: Mold[]): Promise<void> {
        await apiFetch('/molds/batch', {
            method: 'POST',
            body: JSON.stringify({
                molds,
                metadata: { intent: 'BATCH_ASSET_SYNC' }
            })
        })
    }
}
