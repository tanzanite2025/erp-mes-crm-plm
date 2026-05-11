import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type SalesOrderLine } from '../data/schema'

type SalesOrderLineDisplayProjectionSource = Pick<
  ProductDisplayProjectionV2,
  'title' | 'summaryText' | 'code' | 'fullLabel' | 'strategyVersion'
>

export type SalesOrderLineDisplaySnapshot = Pick<
  SalesOrderLine,
  | 'productDisplayTitleSnapshot'
  | 'productDisplaySubtitleSnapshot'
  | 'productDisplayCodeSnapshot'
  | 'productDisplayFullLabelSnapshot'
  | 'productDisplayStrategyVersionSnapshot'
>

function toSalesOrderLineDisplaySnapshot(
  display: SalesOrderLineDisplayProjectionSource
): SalesOrderLineDisplaySnapshot {
  return {
    productDisplayTitleSnapshot: display.title,
    productDisplaySubtitleSnapshot: display.summaryText,
    productDisplayCodeSnapshot: display.code,
    productDisplayFullLabelSnapshot: display.fullLabel,
    productDisplayStrategyVersionSnapshot: display.strategyVersion,
  }
}

function normalizeSnapshotValue(value?: string | null): string {
  return value?.trim() ?? ''
}

export function isSalesOrderLineDisplayPlaceholder(
  value?: string | null
): boolean {
  const normalized = normalizeSnapshotValue(value).toUpperCase()

  return normalized === 'UNNAMED' || normalized.startsWith('UNNAMED (')
}

function hasInvalidGeneratedDisplaySnapshot(
  line: Pick<
    SalesOrderLine,
    'productDisplayTitleSnapshot' | 'productDisplayFullLabelSnapshot'
  >
): boolean {
  return (
    isSalesOrderLineDisplayPlaceholder(line.productDisplayTitleSnapshot) ||
    isSalesOrderLineDisplayPlaceholder(line.productDisplayFullLabelSnapshot)
  )
}

export function buildSalesOrderLineDisplaySnapshot(
  displayProjection: SalesOrderLineDisplayProjectionSource
): SalesOrderLineDisplaySnapshot {
  return toSalesOrderLineDisplaySnapshot(displayProjection)
}

export function mergeSalesOrderLineDisplaySnapshot(
  line: SalesOrderLine,
  displayProjection: SalesOrderLineDisplayProjectionSource
): SalesOrderLineDisplaySnapshot {
  const snapshot = buildSalesOrderLineDisplaySnapshot(displayProjection)

  if (hasInvalidGeneratedDisplaySnapshot(line)) {
    return snapshot
  }

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
