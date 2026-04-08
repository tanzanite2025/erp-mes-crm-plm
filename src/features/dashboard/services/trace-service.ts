import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'

export interface TraceStats {
    wip: number
    scrap: number
    scrapDelta: number
    gapOrders: number
    gapDescription: string
    totalSn: number 
    productionFunnel: { name: string, value: number }[]
}

export const TraceService = {
    /**
     * 获取仪表盘统计数据 (已迁移至后端权威计算接口)
     * [REFACTORED]: 移除前端全量订单聚合，改为调用后端统计模型。
     */
    async getDashboardStats(): Promise<TraceStats> {
        // [BACKEND-AUTHORITY] 直接获取后端预定义的统计指标
        // 包括：wip, scrap, gapOrders, 以及 productionFunnel 指标
        const res = await apiFetch<TraceStats>('/dashboard/stats')
        
        return ensureObjectResponse<TraceStats & Record<string, unknown>>(
            res, 
            'TraceService.getDashboardStats'
        ) as TraceStats
    }
}
