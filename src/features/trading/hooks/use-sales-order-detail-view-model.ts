import { useMemo } from 'react'
import type { SalesOrder } from '../data/schema'

export function useSalesOrderDetailViewModel(order: SalesOrder) {
  const claimableModels = useMemo(() => {
    const models = new Set<string>()
    order.lines.forEach((line) => {
      if (!line.claimedBy) {
        models.add(line.productModel)
      }
    })
    return Array.from(models)
  }, [order.lines])

  return {
    claimableModels,
  }
}
