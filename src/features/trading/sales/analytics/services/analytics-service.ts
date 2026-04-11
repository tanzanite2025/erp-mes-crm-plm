import { 
  getCustomerProductStats, 
  getGlobalProductRanking 
} from '../../services/sales-query-service'

export interface ProductStat {
  productId: string
  productModel: string
  productCode: string
  totalQty: number
  orderCount: number
  totalAmount: number
}

export interface CustomerAnalytics {
  customerId: string
  customerName: string
  totalOrders: number
  totalAmount: number
  products: ProductStat[]
}

/**
 * SalesAnalyticsService - 负责销售数据的多维聚合分析。
 * [REFACTORED]: 所有的聚合计算逻辑已迁移至 Go 后端。
 */
export const SalesAnalyticsService = {
  /**
   * 聚合客户下单产品偏好统计
   * @deprecated 迁移至后端聚合：/sales-orders/analytics/customer-product-stats
   */
  getCustomerProductStats: async (params: { customerId?: string } = {}): Promise<CustomerAnalytics[]> => {
    // 调用后端聚合接口，禁止前端拉取全量订单进行累加
    const data = await getCustomerProductStats(params)
    return data as unknown as CustomerAnalytics[]
  },

  /**
   * 获取全域畅销产品排行 (Top Products Overall)
   * @deprecated 迁移至后端聚合：/sales-orders/analytics/global-product-ranking
   */
  getGlobalProductRanking: async (limit: number = 10): Promise<ProductStat[]> => {
    // 调用后端聚合接口
    const data = await getGlobalProductRanking(limit)
    return data as unknown as ProductStat[]
  }
}
