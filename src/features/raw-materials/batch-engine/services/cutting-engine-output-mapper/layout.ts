import type {
  BatchOptimizerGeometryLayoutZone,
  BatchOptimizerPlanLayoutZone,
} from '../../types/batch-engine-api'
import type { CuttingLayoutZone } from '../../types/cutting-engine-wasm'
import { round } from './math'

function toZoneKind(zone: CuttingLayoutZone) {
  if (zone.kind === 'Roll') return 'roll'
  if (zone.kind === 'Loss') return 'loss'
  return 'piece'
}

function toUsageCategory(zone: CuttingLayoutZone) {
  if (zone.kind === 'Roll') return 'roll'
  if (zone.kind === 'Loss') return 'loss'
  return 'piece'
}

function toPolygonPoints(zone: CuttingLayoutZone) {
  return [
    { x: zone.xMm, y: zone.yMm },
    { x: zone.xMm + zone.widthMm, y: zone.yMm },
    { x: zone.xMm + zone.widthMm, y: zone.yMm + zone.heightMm },
    { x: zone.xMm, y: zone.yMm + zone.heightMm },
  ]
}

export function buildLayoutZone(
  zone: CuttingLayoutZone,
  demandLineId: string,
  allocatedPieces: number,
  coverageSharePercent: number
): BatchOptimizerPlanLayoutZone {
  const isMaterial = zone.kind === 'Material'
  const areaM2 = round((zone.widthMm * zone.heightMm) / 1_000_000, 6)
  return {
    id: zone.id,
    kind: toZoneKind(zone),
    usageCategory: toUsageCategory(zone),
    label: zone.label,
    detail: `${round(zone.widthMm, 1)}mm x ${round(zone.heightMm, 1)}mm`,
    rollId: 'rust-wasm-roll-1',
    demandLineId: isMaterial ? demandLineId : undefined,
    areaM2,
    allocatedSets: 0,
    allocatedPieces: isMaterial ? allocatedPieces : 0,
    coverageSharePercent: isMaterial ? coverageSharePercent : 0,
    tooltipLines: [zone.label, `${round(areaM2, 3)} m2`],
    x: zone.xMm,
    y: zone.yMm,
    width: zone.widthMm,
    height: zone.heightMm,
  }
}

export function buildGeometryZone(
  zone: CuttingLayoutZone,
  demandLineId: string,
  allocatedPieces: number,
  coverageSharePercent: number
): BatchOptimizerGeometryLayoutZone {
  const layoutZone = buildLayoutZone(zone, demandLineId, allocatedPieces, coverageSharePercent)
  return {
    id: layoutZone.id,
    kind: layoutZone.kind,
    usageCategory: layoutZone.usageCategory,
    label: layoutZone.label,
    detail: layoutZone.detail,
    rollId: layoutZone.rollId,
    demandLineId: layoutZone.demandLineId,
    areaM2: layoutZone.areaM2,
    allocatedSets: layoutZone.allocatedSets,
    allocatedPieces: layoutZone.allocatedPieces,
    coverageSharePercent: layoutZone.coverageSharePercent,
    tooltipLines: layoutZone.tooltipLines,
    polygonPoints: toPolygonPoints(zone),
  }
}
