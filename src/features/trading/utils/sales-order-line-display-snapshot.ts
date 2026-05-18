import { type ProductDisplayProjectionV2 } from '@/features/engineering/display/product-display-v2'
import { type SalesOrderLine } from '../data/schema'

type SalesOrderLineDisplayProjectionSource = Pick<
  ProductDisplayProjectionV2,
  'title' | 'summaryText' | 'code' | 'strategyVersion'
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
    productDisplayFullLabelSnapshot: display.title,
    productDisplayStrategyVersionSnapshot: display.strategyVersion,
  }
}

function normalizeSnapshotValue(value?: string | null): string {
  return value?.trim() ?? ''
}

export function buildLegacySalesOrderLineDisplayFullLabel(params: {
  title?: string | null
  subtitle?: string | null
}): string {
  const title = normalizeSnapshotValue(params.title)
  const subtitle = normalizeSnapshotValue(params.subtitle)

  if (!title) {
    return ''
  }

  return subtitle ? `${title} (${subtitle})` : title
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

function shouldReplaceGeneratedFullLabelSnapshot(
  line: Pick<
    SalesOrderLine,
    | 'productDisplayTitleSnapshot'
    | 'productDisplaySubtitleSnapshot'
    | 'productDisplayFullLabelSnapshot'
  >,
  snapshot: SalesOrderLineDisplaySnapshot
): boolean {
  const fullLabelSnapshot = normalizeSnapshotValue(line.productDisplayFullLabelSnapshot)
  const lineTitleSnapshot = normalizeSnapshotValue(line.productDisplayTitleSnapshot)
  const currentTitleSnapshot = normalizeSnapshotValue(snapshot.productDisplayTitleSnapshot)

  if (!fullLabelSnapshot || isSalesOrderLineDisplayPlaceholder(fullLabelSnapshot)) {
    return true
  }

  const historicalLegacyFullLabel = buildLegacySalesOrderLineDisplayFullLabel({
    title: line.productDisplayTitleSnapshot,
    subtitle: line.productDisplaySubtitleSnapshot,
  })
  const currentLegacyFullLabel = buildLegacySalesOrderLineDisplayFullLabel({
    title: snapshot.productDisplayTitleSnapshot,
    subtitle: snapshot.productDisplaySubtitleSnapshot,
  })

  return (
    (lineTitleSnapshot !== '' && lineTitleSnapshot === currentTitleSnapshot && fullLabelSnapshot === historicalLegacyFullLabel) ||
    fullLabelSnapshot === currentLegacyFullLabel
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
  const replaceFullLabelSnapshot = shouldReplaceGeneratedFullLabelSnapshot(
    line,
    snapshot
  )

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
      replaceFullLabelSnapshot
        ? snapshot.productDisplayFullLabelSnapshot
        : line.productDisplayFullLabelSnapshot || snapshot.productDisplayFullLabelSnapshot,
    productDisplayStrategyVersionSnapshot:
      line.productDisplayStrategyVersionSnapshot || snapshot.productDisplayStrategyVersionSnapshot,
  }
}
