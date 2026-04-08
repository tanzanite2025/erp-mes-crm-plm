/**
 * Material Usage Service 🏷️ (Real Data Driven)
 * 职责：基于真实已保存的 BOM 配方数据，统计物料在各工序的使用频率。
 * 纠偏：移除所有模拟数据，确保“无数据不显示占比”。
 */

import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('MaterialUsageService')

export interface UsageStat {
    stage: string;      
    percentage: number; 
}

export const MaterialUsageService = {
    async getStageUsageStats(materialId: string): Promise<UsageStat[]> {
        if (!materialId) return []

        try {
            // [BACKEND-AUTHORITY]: 准确的使用占比统计必须由后端聚合服务计算（涉及配方分层、单位换算等）
            // 严禁在前端拉取全量 BOM 进行 O(N) 扫描。
            const res = await apiFetch<UsageStat[]>(`/materials/${materialId}/usage/stats`)
            if (!res) {
                // 如果后端尚未同步统计数据，返回空数组而非错误干扰
                return []
            }
            return res.slice(0, 2)
        } catch (error) {
            logger.error('Material usage service authoritative stats failed', error)
            return []
        }
    }
}
