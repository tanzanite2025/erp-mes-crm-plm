import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export interface AssetDashboardActivity {
    moldSn: string
    toFactory: string
    contactPerson: string
    loanDate: string
    status: 'ACTIVE' | 'RETURNED' | 'OVERDUE'
}

export interface AssetDashboardData {
    moldStats: {
        total: number
        idle: number
        inUse: number
        maintenance: number
        fault: number
    }
    furnaceStats: {
        total: number
        idle: number
        running: number
        fault: number
    }
    healthVectors: {
        avgLifeConsumpt: number
        alertCount: number
    }
    recentActivities: AssetDashboardActivity[]
}

/**
 * useAssetDashboard - 获取资产中心工业级看板聚合数据
 */
export function useAssetDashboard() {
    return useQuery<AssetDashboardData>({
        queryKey: ['asset_dashboard_stats'],
        queryFn: () => apiFetch('/molds/dashboard/stats'),
        refetchInterval: 1000 * 30, // 30秒自动刷新
    })
}
