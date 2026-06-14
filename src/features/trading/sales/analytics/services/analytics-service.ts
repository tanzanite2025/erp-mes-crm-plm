import type {
  CustomerAnalytics,
  ProductStat,
} from '../../adapters/sales-analytics-api-adapter'
import {
  getCustomerProductStats,
  getGlobalProductRanking,
} from '../../services/sales-query-service'

export type {
  CustomerAnalytics,
  ProductStat,
} from '../../adapters/sales-analytics-api-adapter'

/**
 * SalesAnalyticsService - 负责销售 analytics contract 查询。
 */
export const SalesAnalyticsService = {
  /**
   * 获取客户维度产品偏好分析。
   */
  getCustomerProductStats: async (
    params: { customerId?: string } = {}
  ): Promise<CustomerAnalytics[]> => {
    return getCustomerProductStats(params)
  },

  /**
   * 获取全域畅销产品排行。
   */
  getGlobalProductRanking: async (
    limit: number = 10
  ): Promise<ProductStat[]> => {
    return getGlobalProductRanking(limit)
  },
}
