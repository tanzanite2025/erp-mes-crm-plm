import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { SalesOrder } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'
import {
  getSalesOrderAfterSalesSummaries,
  type SalesOrderAfterSalesSummary,
} from '../sales/services/sales-order-after-sales-summary-service'

export interface SalesOrderAfterSalesCardResources {
  summaryByOrderId: Map<string, SalesOrderAfterSalesSummary>
  summariesReady: boolean
  isLoading: boolean
  isError: boolean
  error: Error | null
}

function normalizeSalesOrderAfterSalesSummaryOrderIds(
  orders: ReadonlyArray<SalesOrder>
): string[] {
  const seen = new Set<string>()
  const orderIds: string[] = []

  orders.forEach((order) => {
    const orderId = order.id.trim()
    if (!orderId || seen.has(orderId)) {
      return
    }

    seen.add(orderId)
    orderIds.push(orderId)
  })

  return orderIds.sort((left, right) => left.localeCompare(right))
}

export function useSalesOrderAfterSalesCardResources(
  orders: ReadonlyArray<SalesOrder>
): SalesOrderAfterSalesCardResources {
  const orderIds = useMemo(
    () => normalizeSalesOrderAfterSalesSummaryOrderIds(orders),
    [orders]
  )

  const summariesQuery = useQuery({
    queryKey: tradingQueryKeys.salesOrderAfterSalesSummary(orderIds),
    queryFn: () => getSalesOrderAfterSalesSummaries(orderIds),
    enabled: orderIds.length > 0,
  })

  const summaryByOrderId = useMemo(() => {
    const map = new Map<string, SalesOrderAfterSalesSummary>()
    ;(summariesQuery.data ?? []).forEach((summary) => {
      map.set(summary.salesOrderId, summary)
    })
    return map
  }, [summariesQuery.data])

  return {
    summaryByOrderId,
    summariesReady: orderIds.length === 0 || Boolean(summariesQuery.data),
    isLoading: summariesQuery.isLoading,
    isError: summariesQuery.isError,
    error: summariesQuery.error ?? null,
  }
}
