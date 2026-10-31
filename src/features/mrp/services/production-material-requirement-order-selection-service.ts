import { SALES_ORDER_PRODUCTION_SOURCE_STATUSES } from '@/features/trading/data/sales-order-production-source-eligibility'
import type { SalesOrder } from '@/features/trading/data/schema'
import { getSalesOrders } from '@/features/trading/sales'

export async function loadAllActiveSalesOrdersForProductionMaterialRequirementSelection(): Promise<
  SalesOrder[]
> {
  const orders: SalesOrder[] = []
  const seenIds = new Set<string>()
  let expectedTotal: number | undefined
  for (let page = 1; ; page += 1) {
    const response = await getSalesOrders({
      page,
      pageSize: 200,
      withLines: true,
      status: [...SALES_ORDER_PRODUCTION_SOURCE_STATUSES],
    })
    if (expectedTotal !== undefined && response.total !== expectedTotal)
      throw new Error(
        '[CRITICAL] Order scope changed while loading; refresh the selection.'
      )
    expectedTotal = response.total
    for (const order of response.items) {
      if (seenIds.has(order.id))
        throw new Error(
          '[CRITICAL] Repeated order while loading the full selection; refresh the selection.'
        )
      seenIds.add(order.id)
      orders.push(order)
    }
    if (orders.length === expectedTotal) return orders
    if (orders.length > expectedTotal || response.items.length === 0)
      throw new Error(
        '[CRITICAL] Incomplete active order scope; refresh the selection.'
      )
  }
}
