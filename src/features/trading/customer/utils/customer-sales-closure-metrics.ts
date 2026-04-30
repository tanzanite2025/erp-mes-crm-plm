import { type CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'

export interface CustomerSalesClosureMetrics {
  closedOrderCount: number
  openOrderCount: number
  canceledOrderCount: number
  totalOrders: number
  effectiveOrderCount: number
  closureRatioLabel: string
  closureStatusLabel: string
  canceledStatusLabel: string
  hasOrderHistory: boolean
  isFullyClosed: boolean
}

export function getCustomerSalesClosureMetrics(
  summary?: CustomerSalesClosureSummary
): CustomerSalesClosureMetrics {
  const totalOrders = Math.max(0, summary?.totalOrders ?? 0)
  const effectiveOrderCount = Math.min(Math.max(0, summary?.effectiveOrderCount ?? 0), totalOrders)
  const openOrderCount = Math.min(Math.max(0, summary?.openOrderCount ?? 0), effectiveOrderCount)
  const closedOrderCount = Math.min(Math.max(0, summary?.closedOrderCount ?? 0), effectiveOrderCount)
  const canceledOrderCount = Math.min(Math.max(0, summary?.canceledOrderCount ?? 0), totalOrders)
  const hasOrderHistory = totalOrders > 0
  const hasEffectiveOrderHistory = effectiveOrderCount > 0
  const isFullyClosed = hasEffectiveOrderHistory && openOrderCount === 0

  let closureStatusLabel = '暂无订单'
  if (hasEffectiveOrderHistory) {
    closureStatusLabel = isFullyClosed ? '全部闭环' : `未闭环 ${openOrderCount} 单`
  } else if (hasOrderHistory && canceledOrderCount > 0) {
    closureStatusLabel = '无有效订单'
  }
  const canceledStatusLabel = canceledOrderCount > 0 ? `已作废 ${canceledOrderCount} 单` : ''

  return {
    closedOrderCount,
    openOrderCount,
    canceledOrderCount,
    totalOrders,
    effectiveOrderCount,
    closureRatioLabel: `${closedOrderCount}/${effectiveOrderCount}`,
    closureStatusLabel,
    canceledStatusLabel,
    hasOrderHistory,
    isFullyClosed,
  }
}
