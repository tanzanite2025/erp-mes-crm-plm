import { type Product } from '@/features/engineering/data/schema'
import {
  resolveProductDisplay,
  type ProductDisplayProjection,
} from '@/features/engineering/display/product-display-contract'
import { type SalesOrderLine } from '../data/schema'

export type SalesOrderLineDisplaySnapshot = Pick<
  SalesOrderLine,
  | 'productDisplayTitleSnapshot'
  | 'productDisplaySubtitleSnapshot'
  | 'productDisplayCodeSnapshot'
  | 'productDisplayFullLabelSnapshot'
  | 'productDisplayStrategyVersionSnapshot'
>

function toSalesOrderLineDisplaySnapshot(
  display: ProductDisplayProjection
): SalesOrderLineDisplaySnapshot {
  return {
    productDisplayTitleSnapshot: display.title,
    productDisplaySubtitleSnapshot: display.subtitle,
    productDisplayCodeSnapshot: display.code,
    productDisplayFullLabelSnapshot: display.fullLabel,
    productDisplayStrategyVersionSnapshot: display.strategyVersion,
  }
}

export function buildSalesOrderLineDisplaySnapshot(
  product: Product
): SalesOrderLineDisplaySnapshot {
  return toSalesOrderLineDisplaySnapshot(resolveProductDisplay(product))
}

export function mergeSalesOrderLineDisplaySnapshot(
  line: SalesOrderLine,
  product: Product
): SalesOrderLineDisplaySnapshot {
  const snapshot = buildSalesOrderLineDisplaySnapshot(product)

  return {
    productDisplayTitleSnapshot:
      line.productDisplayTitleSnapshot || snapshot.productDisplayTitleSnapshot,
    productDisplaySubtitleSnapshot:
      line.productDisplaySubtitleSnapshot || snapshot.productDisplaySubtitleSnapshot,
    productDisplayCodeSnapshot:
      line.productDisplayCodeSnapshot || snapshot.productDisplayCodeSnapshot,
    productDisplayFullLabelSnapshot:
      line.productDisplayFullLabelSnapshot || snapshot.productDisplayFullLabelSnapshot,
    productDisplayStrategyVersionSnapshot:
      line.productDisplayStrategyVersionSnapshot || snapshot.productDisplayStrategyVersionSnapshot,
  }
}
