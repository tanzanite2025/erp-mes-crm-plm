import { useQuery, useQueryClient } from '@tanstack/react-query'
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

export const ASSET_DASHBOARD_QUERY_KEY = ['asset_dashboard_stats'] as const

export function useAssetDashboard() {
  const queryClient = useQueryClient()
  const query = useQuery<AssetDashboardData>({
    queryKey: ASSET_DASHBOARD_QUERY_KEY,
    queryFn: () => apiFetch('/molds/dashboard/stats'),
    refetchInterval: 1000 * 30,
  })

  return {
    ...query,
    refresh: () => queryClient.invalidateQueries({ queryKey: ASSET_DASHBOARD_QUERY_KEY }),
  }
}
