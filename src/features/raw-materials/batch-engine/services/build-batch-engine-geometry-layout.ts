import type {
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
} from '../types'
import type {
  StripFirstLayout,
  StripLayoutPoint,
  StripLayoutZone,
} from './build-strip-first-layout'

function resolvePolygonBounds(points: StripLayoutPoint[]) {
  if (!points.length) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }
  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y
  for (const point of points.slice(1)) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

function toCanvasZoneKind(kind: string): StripLayoutZone['kind'] {
  if (
    kind === 'roll' ||
    kind === 'loss' ||
    kind === 'strip' ||
    kind === 'piece' ||
    kind === 'aggregate'
  ) {
    return kind
  }
  return 'aggregate'
}

export function buildBatchEngineGeometryLayout(
  selectedPlan: BatchOptimizerPlan,
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
): StripFirstLayout | null {
  const geometryLayoutSummary = selectedPlan.geometryLayoutSummary
  if (!geometryLayoutSummary) {
    return null
  }

  const diffZoneIdSet = new Set(activeDiffSummary?.highlightZoneIds ?? [])
  const zones: StripLayoutZone[] = geometryLayoutSummary.zones.map((zone) => {
    const polygonPoints = zone.polygonPoints.map((point) => ({
      x: point.x,
      y: point.y,
    }))
    const bounds = resolvePolygonBounds(polygonPoints)
    return {
      id: zone.id,
      kind: toCanvasZoneKind(zone.kind),
      x: bounds.minX,
      y: bounds.minY,
      width: Math.max(bounds.maxX - bounds.minX, 0),
      height: Math.max(bounds.maxY - bounds.minY, 0),
      usageCategory: zone.usageCategory,
      label: zone.label,
      detail: zone.detail || '--',
      rollId: zone.rollId,
      demandLineId: zone.demandLineId,
      areaM2: zone.areaM2,
      allocatedSets: zone.allocatedSets,
      allocatedPieces: zone.allocatedPieces,
      coverageSharePercent: zone.coverageSharePercent,
      tooltipLines: diffZoneIdSet.has(zone.id)
        ? [
            ...zone.tooltipLines,
            `差异热区: 当前方案与 Top${activeDiffSummary?.baselinePlanRank ?? 1} 基准存在布局差异`,
          ]
        : zone.tooltipLines,
      isDiffHighlighted: diffZoneIdSet.has(zone.id),
      interactive: true,
      polygonPoints,
    }
  })

  return {
    widthMm: Math.max(geometryLayoutSummary.canvasWidthMm, 1),
    heightMm: Math.max(geometryLayoutSummary.canvasHeightMm, 1),
    zones,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: Math.max(geometryLayoutSummary.canvasWidthMm, 1),
      maxY: Math.max(geometryLayoutSummary.canvasHeightMm, 1),
    },
  }
}
