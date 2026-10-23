import { type BOM } from '../data/schema'

export type BOMProductPerformanceVersionWeightSource = Pick<
  BOM,
  | 'id'
  | 'productId'
  | 'bomType'
  | 'ownerType'
  | 'ownerCustomerId'
  | 'versionLevel'
  | 'measuredWeight'
  | 'measuredWeightUnit'
  | 'bomVersion'
  | 'status'
  | 'isLocked'
>

export interface BOMProductPerformanceVersionWeightComparisonEntry {
  bom: BOMProductPerformanceVersionWeightSource
  isCurrentBOM: boolean
  isSessionDraft?: boolean
}

export function getBOMProductPerformanceVersionWeightDraftKey(
  bom: BOMProductPerformanceVersionWeightSource,
  versionValue = bom.versionLevel ?? ''
): string {
  return JSON.stringify([
    bom.id,
    bom.productId,
    bom.bomType,
    bom.ownerType,
    bom.ownerType === 'CUSTOMER' ? (bom.ownerCustomerId ?? '') : '',
    versionValue,
  ])
}

export function buildBOMProductPerformanceVersionWeightComparison(
  currentBOM: BOMProductPerformanceVersionWeightSource,
  savedBOMs: readonly BOM[]
): Map<string, BOMProductPerformanceVersionWeightComparisonEntry> {
  const comparison = new Map<
    string,
    BOMProductPerformanceVersionWeightComparisonEntry
  >()
  if (!currentBOM.productId) return comparison

  // Keep lifecycle revisions, customers and design/production weights distinct.
  // A released BOM represents a saved version; the open BOM always shows its draft.
  const candidates = savedBOMs
    .filter(
      (bom) =>
        bom.productId === currentBOM.productId &&
        bom.bomType === currentBOM.bomType &&
        (bom.ownerType ?? 'INTERNAL') === currentBOM.ownerType &&
        (currentBOM.ownerType !== 'CUSTOMER' ||
          (bom.ownerCustomerId ?? '') === (currentBOM.ownerCustomerId ?? '')) &&
        bom.status !== 'OBSOLETE' &&
        bom.id !== currentBOM.id &&
        Boolean(bom.versionLevel?.trim())
    )
    .sort((left, right) => {
      const lifecyclePriority =
        Number(right.status === 'RELEASED') - Number(left.status === 'RELEASED')
      if (lifecyclePriority) return lifecyclePriority
      const leftTime = Date.parse(left.createdAt ?? '') || 0
      const rightTime = Date.parse(right.createdAt ?? '') || 0
      return rightTime - leftTime || right.version - left.version
    })

  for (const bom of candidates) {
    const versionValue = bom.versionLevel!.trim()
    if (!comparison.has(versionValue)) {
      comparison.set(versionValue, { bom, isCurrentBOM: false })
    }
  }
  const currentVersionValue = currentBOM.versionLevel?.trim()
  if (currentVersionValue) {
    comparison.set(currentVersionValue, { bom: currentBOM, isCurrentBOM: true })
  }
  return comparison
}

export function formatBOMProductPerformanceVersionWeight(
  bom: Pick<BOM, 'measuredWeight' | 'measuredWeightUnit'>,
  locale: string
): string {
  if (!Number.isFinite(bom.measuredWeight) || bom.measuredWeight <= 0) {
    return locale.startsWith('zh') ? '未填重量' : 'Weight not entered'
  }
  const weight = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 6,
  }).format(bom.measuredWeight)
  const unit = bom.measuredWeightUnit.trim()
  return unit
    ? `${weight} ${unit}`
    : `${weight} · ${locale.startsWith('zh') ? '未填单位' : 'Unit missing'}`
}
