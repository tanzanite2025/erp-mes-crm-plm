import { useMemo } from 'react'
import type { SalesOrder, SalesOrderLine } from '../data/schema'

export interface SalesOrderLineRow {
  key: string
  line: SalesOrderLine
  deliveredQty: number
  deliveredRatio: number
  deliveredPercent: number
  deliveredTextClass: string
  deliveredBarClass: string
  routeLabel: string
  jobNoLabel: string
  customerPartNoLabel: string
  specificationLabel: string
  descriptionLabel: string
}

export function useSalesOrderDetailLineRows(order: SalesOrder) {
  return useMemo<SalesOrderLineRow[]>(() => {
    return order.lines.map((line) => {
      const deliveredQty = line.deliveredQty || 0
      const deliveredRatio = line.qty ? Math.min(1, deliveredQty / line.qty) : 0
      const deliveredPercent = Math.min(100, deliveredRatio * 100)

      return {
        key: `${order.id}-${line.lineNo}`,
        line,
        deliveredQty,
        deliveredRatio,
        deliveredPercent,
        deliveredTextClass: deliveredQty > 0 ? 'text-primary' : 'text-foreground',
        deliveredBarClass: deliveredQty >= line.qty ? 'bg-emerald-500' : 'bg-primary',
        routeLabel: line.route || '',
        jobNoLabel: line.jobNo || '-',
        customerPartNoLabel: line.customerPartNo || '-',
        specificationLabel: line.specification || '',
        descriptionLabel: line.description || '',
      }
    })
  }, [order.id, order.lines])
}
