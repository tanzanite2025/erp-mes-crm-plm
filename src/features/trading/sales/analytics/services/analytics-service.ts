import { getSalesOrders } from '../../services/sales-query-service'
import { type SalesOrder, type SalesOrderLine } from '../../../data/schema'

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
 * SalesAnalyticsService - 负责销售数据的多维聚合分析情况情况情况总量情况情况。
 */
export const SalesAnalyticsService = {
  /**
   * 聚合客户下单产品偏好统计
   */
  getCustomerProductStats: async (params: { customerId?: string } = {}): Promise<CustomerAnalytics[]> => {
    // 1. 获取全量订单 (携带明细行)
    const response = await getSalesOrders({ withLines: true, pageSize: 1000 })
    const orders = response.items
    
    const customerMap = new Map<string, CustomerAnalytics>()

    orders.forEach((order: SalesOrder) => {
      // 如果指定了客户 ID，则过滤
      if (params.customerId && order.customerId !== params.customerId) return

      const cId = order.customerId || 'UNKNOWN_CUSTOMER'
      
      if (!customerMap.has(cId)) {
        customerMap.set(cId, {
          customerId: cId,
          customerName: order.customerName,
          totalOrders: 0,
          totalAmount: 0,
          products: [],
        })
      }

      const stats = customerMap.get(cId)!
      stats.totalOrders += 1
      stats.totalAmount += order.amount

      // 聚合订单行 (产品维度)
      order.lines.forEach((line: SalesOrderLine) => {
        const pId = line.productId || `UNKNOWN_${line.productCode}`
        
        let productStat = stats.products.find(p => p.productId === pId)
        if (!productStat) {
          productStat = {
            productId: pId,
            productModel: line.productModel,
            productCode: line.productCode,
            totalQty: 0,
            orderCount: 0,
            totalAmount: 0,
          }
          stats.products.push(productStat)
        }

        productStat.totalQty += line.qty
        productStat.orderCount += 1
        productStat.totalAmount += line.amount
      })
    })

    // 2. 内部排序：每个客户的产品按下单量倒序排列
    const result = Array.from(customerMap.values())
    result.forEach(stats => {
      stats.products.sort((a, b) => b.totalQty - a.totalQty)
    })

    return result
  },

  /**
   * 获取全域畅销产品排行 (Top Products Overall)
   */
  getGlobalProductRanking: async (limit: number = 10): Promise<ProductStat[]> => {
    const response = await getSalesOrders({ withLines: true, pageSize: 1000 })
    const orders = response.items
    const productMap = new Map<string, ProductStat>()

    orders.forEach(order => {
      order.lines.forEach(line => {
        const pId = line.productId || `UNKNOWN_${line.productCode}`
        if (!productMap.has(pId)) {
          productMap.set(pId, {
            productId: pId,
            productModel: line.productModel,
            productCode: line.productCode,
            totalQty: 0,
            orderCount: 0,
            totalAmount: 0,
          })
        }
        const stat = productMap.get(pId)!
        stat.totalQty += line.qty
        stat.orderCount += 1
        stat.totalAmount += line.amount
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, limit)
  }
}
