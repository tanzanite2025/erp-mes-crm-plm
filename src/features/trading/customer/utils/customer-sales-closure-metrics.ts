import { type CustomerSalesClosureSummary } from '../services/customer-sales-closure-summary-service'

export interface CustomerSalesClosureMetrics {
  primaryStatusCode: string
  primaryStatusPhase: string
  effectiveStatusCounts: Array<{
    code: string
    phase: string
    count: number
  }>
  canceledOrderCount: number
  totalOrders: number
  effectiveOrderCount: number
  hasOrderHistory: boolean
  hasEffectiveOrderHistory: boolean
  hasOnlyCanceledOrders: boolean
  areAllEffectiveOrdersDone: boolean
}

function isCanceledStatus(code: string): boolean {
  return code.trim().toLowerCase() === 'canceled' || code.trim().toLowerCase() === 'cancelled'
}

export function getCustomerSalesClosureMetrics(
  summary?: CustomerSalesClosureSummary
): CustomerSalesClosureMetrics {
  const totalOrders = Math.max(0, summary?.totalOrders ?? 0)
  const effectiveOrderCount = Math.min(Math.max(0, summary?.effectiveOrderCount ?? 0), totalOrders)
  const canceledOrderCount = Math.min(Math.max(0, summary?.canceledOrderCount ?? 0), totalOrders)
  const hasOrderHistory = totalOrders > 0
  const hasEffectiveOrderHistory = effectiveOrderCount > 0
  const hasOnlyCanceledOrders = hasOrderHistory && !hasEffectiveOrderHistory && canceledOrderCount > 0
  const sanitizedStatusCounts = (summary?.statusCounts ?? [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      code: item.code,
      phase: item.phase,
      count: item.count,
    }))
  const effectiveStatusCounts = sanitizedStatusCounts.filter((item) => !isCanceledStatus(item.code))
  const areAllEffectiveOrdersDone =
    hasEffectiveOrderHistory && effectiveStatusCounts.every((item) => item.phase.trim().toLowerCase() === 'done')
  const primaryStatusCode =
    summary?.primaryStatusCode.trim() || effectiveStatusCounts[0]?.code || sanitizedStatusCounts[0]?.code || ''
  const primaryStatusPhase =
    summary?.primaryStatusPhase.trim() ||
    effectiveStatusCounts.find((item) => item.code === primaryStatusCode)?.phase ||
    sanitizedStatusCounts.find((item) => item.code === primaryStatusCode)?.phase ||
    ''

  return {
    primaryStatusCode,
    primaryStatusPhase,
    effectiveStatusCounts,
    canceledOrderCount,
    totalOrders,
    effectiveOrderCount,
    hasOrderHistory,
    hasEffectiveOrderHistory,
    hasOnlyCanceledOrders,
    areAllEffectiveOrdersDone,
  }
}
