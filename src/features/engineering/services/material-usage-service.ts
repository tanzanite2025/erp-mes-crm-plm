/**
 * Material Usage Service 🏷️ (Real Data Driven)
 * 职责：基于真实已保存的 BOM 配方数据，统计物料在各工序的使用频率。
 * 纠偏：移除所有模拟数据，确保“无数据不显示占比”。
 */

import { bomService } from './bom-service'
import { createLogger } from '@/lib/logger'

const logger = createLogger('MaterialUsageService')

export interface UsageStat {
    stage: string;      
    percentage: number; 
}

export const MaterialUsageService = {
    /**
     * 从本地存储加载并计算物料的使用占比
     * 逻辑：实时扫描所有 BOM 记录，聚合统计物料在各工段的分布
     */
    async getStageUsageStats(materialId: string): Promise<UsageStat[]> {
        if (typeof window === 'undefined' || !materialId) return []

        try {
            // 1. 获取全量 BOM 数据
            const boms = await bomService.getBOMs()
            if (!boms || !Array.isArray(boms) || boms.length === 0) return []

            // 2. 收集该物料的所有使用记录
            const usageRecords: { section: string }[] = []
            boms.forEach(bom => {
                bom.items.forEach(item => {
                    if (item.materialId === materialId && item.section) {
                        usageRecords.push({ section: item.section })
                    }
                })
            })

            // 3. 如果没有任何历史记录，返回空数组（避免显示 10%/5% 模拟值）
            if (usageRecords.length === 0) return []

            // 4. 聚合统计
            const sectionCounts: Record<string, number> = {}
            usageRecords.forEach(rec => {
                sectionCounts[rec.section] = (sectionCounts[rec.section] || 0) + 1
            })

            // 5. 转换为百分比并排序
            const totalUsage = usageRecords.length
            const stats: UsageStat[] = Object.entries(sectionCounts).map(([stage, count]) => ({
                stage,
                percentage: Math.round((count / totalUsage) * 100)
            })).sort((a, b) => b.percentage - a.percentage)

            // 6. 返回 Top 2
            return stats.slice(0, 2)
        } catch (error) {
            logger.error('Material usage service error', error)
            return []
        }
    }
}
