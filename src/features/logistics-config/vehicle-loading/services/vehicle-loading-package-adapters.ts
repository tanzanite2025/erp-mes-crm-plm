import type { ShipmentSummary } from '../data/vehicle-loading.types'
import type { PackageLoadProfile } from '../engine/load-planning/load-planning.types'

export type PackageProfileAdapterContext = {
  sourceId?: string
  sourceName?: string
}

export type PackageProfileAdapter = (summary: ShipmentSummary, context?: PackageProfileAdapterContext) => PackageLoadProfile

function buildManualPackageProfile(summary: ShipmentSummary, context?: PackageProfileAdapterContext): PackageLoadProfile {
  return {
    packageId: context?.sourceId ?? 'manual-shipment',
    name: context?.sourceName ?? '手动试算装箱',
    quantity: summary.boxes,
    dimension: {
      lengthMm: 660,
      widthMm: 660,
      heightMm: 800,
      canRotate: true,
      canInvert: false,
    },
    unitWeightKg: summary.boxes > 0 ? summary.totalWeightKg / summary.boxes : summary.totalWeightKg,
  }
}

export function manualPackageProfileAdapter(
  summary: ShipmentSummary,
  context?: PackageProfileAdapterContext
): PackageLoadProfile {
  return buildManualPackageProfile(summary, context)
}

export function packingRulePackageProfileAdapter(
  summary: ShipmentSummary,
  context?: PackageProfileAdapterContext
): PackageLoadProfile {
  return {
    packageId: context?.sourceId ?? 'packing-rule-shipment',
    name: context?.sourceName ?? '包装规则结果',
    quantity: summary.boxes,
    dimension: {
      lengthMm: 660,
      widthMm: 660,
      heightMm: 800,
      canRotate: true,
      canInvert: false,
    },
    unitWeightKg: summary.boxes > 0 ? summary.totalWeightKg / summary.boxes : summary.totalWeightKg,
  }
}

export function apiPackageProfileAdapter(
  summary: ShipmentSummary,
  context?: PackageProfileAdapterContext
): PackageLoadProfile {
  return {
    packageId: context?.sourceId ?? 'api-shipment',
    name: context?.sourceName ?? 'API 装箱结果',
    quantity: summary.boxes,
    dimension: {
      lengthMm: 660,
      widthMm: 660,
      heightMm: 800,
      canRotate: true,
      canInvert: false,
    },
    unitWeightKg: summary.boxes > 0 ? summary.totalWeightKg / summary.boxes : summary.totalWeightKg,
  }
}

export function createDefaultPackageProfileAdapter(): PackageProfileAdapter {
  return manualPackageProfileAdapter
}
