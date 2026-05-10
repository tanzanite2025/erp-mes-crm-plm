import { useMemo } from 'react'
import type { SalesOrder, SalesOrderLine } from '../data/schema'
import {
  resolveSalesOrderLineDisplaySubtitle,
  resolveSalesOrderLineDisplayTitle,
} from '../utils/sales-order-line-display'

export interface SalesOrderLineRow {
  key: string
  line: SalesOrderLine
  displayTitle: string
  displaySubtitle: string
  deliveredQty: number
  deliveredRatio: number
  deliveredPercent: number
  deliveredTextClass: string
  deliveredBarClass: string
  routeLabel: string
  descriptionLabel: string
  appearanceNameLabel: string
  appearanceCodeLabel: string
  appearanceDescriptionLabel: string
  appearanceImageUrl: string
  holeCountLabel: string
  quantityLabel: string
  modelCodeSnapshotLabel: string
  holePrefixSnapshotLabel: string
}

export function useSalesOrderDetailLineRows(order: SalesOrder) {
  return useMemo<SalesOrderLineRow[]>(() => {
    return order.lines.map((line) => {
      const deliveredQty = line.deliveredQty || 0
      const deliveredRatio = line.qty ? Math.min(1, deliveredQty / line.qty) : 0
      const deliveredPercent = Math.min(100, deliveredRatio * 100)
      const displayTitle = resolveSalesOrderLineDisplayTitle(line)
      const displaySubtitle = resolveSalesOrderLineDisplaySubtitle(line)

      return {
        key: `${order.id}-${line.lineNo}`,
        line,
        displayTitle,
        displaySubtitle,
        deliveredQty,
        deliveredRatio,
        deliveredPercent,
        deliveredTextClass: deliveredQty > 0 ? 'text-primary' : 'text-foreground',
        deliveredBarClass: deliveredQty >= line.qty ? 'bg-emerald-500' : 'bg-primary',
        routeLabel: line.route || '',
        descriptionLabel: line.description || '',
        appearanceNameLabel: line.appearanceNameSnapshot || '',
        appearanceCodeLabel: line.appearanceBarcodeCodeSnapshot || '',
        appearanceDescriptionLabel: line.appearanceDescriptionSnapshot || '',
        appearanceImageUrl: line.appearanceImageUrlSnapshot || '',
        holeCountLabel: line.holeCount !== undefined ? String(line.holeCount) : '',
        quantityLabel: line.qty.toLocaleString(),
        modelCodeSnapshotLabel: line.modelCodeSnapshot || '',
        holePrefixSnapshotLabel: line.holePrefixSnapshot || '',
      }
    })
  }, [order.id, order.lines])
}
