import { type CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'

export interface CustomerSalesClosureMetrics {
  closedOrderCount: number
  openOrderCount: number
  totalOrders: number
  closureRatioLabel: string
  closureStatusLabel: string
  hasOrderHistory: boolean
  isFullyClosed: boolean
}

export function getCustomerSalesClosureMetrics(
  summary?: CustomerSalesClosureSummary
): CustomerSalesClosureMetrics {
  const totalOrders = Math.max(0, summary?.totalOrders ?? 0)
  const openOrderCount = Math.max(0, summary?.openOrderCount ?? 0)
  const closedOrderCount = Math.max(0, totalOrders - openOrderCount)
  const hasOrderHistory = totalOrders > 0
  const isFullyClosed = hasOrderHistory && openOrderCount === 0

  let closureStatusLabel = '暂无订单'
  if (hasOrderHistory) {
    closureStatusLabel = isFullyClosed ? '全部闭环' : `未闭环 ${openOrderCount} 单`
  }

  return {
    closedOrderCount,
    openOrderCount,
    totalOrders,
    closureRatioLabel: `${closedOrderCount}/${totalOrders}`,
    closureStatusLabel,
    hasOrderHistory,
    isFullyClosed,
  }
}
