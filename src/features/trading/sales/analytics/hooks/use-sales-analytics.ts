import { useQuery } from '@tanstack/react-query'
import { SalesAnalyticsService } from '../services/analytics-service'

export const useSalesAnalytics = (params: { customerId?: string } = {}) => {
  return useQuery({
    queryKey: ['sales-analytics', params],
    queryFn: () => SalesAnalyticsService.getCustomerProductStats(params),
  })
}

export const useGlobalProductRanking = (limit: number = 10) => {
  return useQuery({
    queryKey: ['sales-analytics', 'global-ranking', limit],
    queryFn: () => SalesAnalyticsService.getGlobalProductRanking(limit),
  })
}
