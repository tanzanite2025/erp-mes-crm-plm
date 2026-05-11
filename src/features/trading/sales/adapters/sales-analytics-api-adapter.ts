import type {
  CustomerAnalyticsApiDTO,
  SalesAnalyticsProductDisplayApiDTO,
  SalesAnalyticsProductStatApiDTO,
} from '../contracts/sales-analytics-api-dto'
import type { SalesAnalyticsProductDisplay } from '../contracts/sales-analytics-product-display'

export interface ProductStat {
  productId: string
  productDisplay: SalesAnalyticsProductDisplay
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

function toProductDisplayContract(
  dto: SalesAnalyticsProductDisplayApiDTO
): SalesAnalyticsProductDisplay {
  return {
    title: dto.title,
    subtitle: dto.subtitle,
    code: dto.code,
    fullLabel: dto.fullLabel,
    strategyVersion: dto.strategyVersion,
  }
}

function toProductStatContract(dto: SalesAnalyticsProductStatApiDTO): ProductStat {
  return {
    productId: dto.productId,
    productDisplay: toProductDisplayContract(dto.productDisplay),
    totalQty: dto.totalQty,
    orderCount: dto.orderCount,
    totalAmount: dto.totalAmount,
  }
}

export function toCustomerAnalyticsContract(
  dto: CustomerAnalyticsApiDTO
): CustomerAnalytics {
  return {
    customerId: dto.customerId,
    customerName: dto.customerName,
    totalOrders: dto.totalOrders,
    totalAmount: dto.totalAmount,
    products: dto.products.map(toProductStatContract),
  }
}

export function toCustomerAnalyticsArrayContract(
  items: CustomerAnalyticsApiDTO[]
): CustomerAnalytics[] {
  return items.map(toCustomerAnalyticsContract)
}

export function toProductStatArrayContract(
  items: SalesAnalyticsProductStatApiDTO[]
): ProductStat[] {
  return items.map(toProductStatContract)
}
