'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type Mold } from '../data/schema'

/**
 * ArchiveService - 负责模具资产的退役归档与技术遗产保留 (已同步至后端)
 */
export class ArchiveService {
    /**
     * 获取所有已归档模具
     */
    static async getArchivedMolds(): Promise<Mold[]> {
        const data = await apiFetch<Mold[]>('/molds/archive')
        return ensureArrayResponse<Mold>(data, 'Archived molds')
    }

    /**
     * 归档模具
     * 将模具从主库移除并存入归档库
     */
    static async archive(mold: Mold, reason: string): Promise<void> {
        await apiFetch(`/molds/${mold.id}/archive`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        })
        
        window.dispatchEvent(new CustomEvent('xdfc_molds_updated'))
        console.log(`[ARCHIVE] Mold ${mold.sn} 已正式进入技术档案库保存。原因: ${reason}`)
    }
}
