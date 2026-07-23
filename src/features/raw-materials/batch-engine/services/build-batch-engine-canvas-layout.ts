import type {
  BatchEngineNormalizedControls,
  BatchEngineSimulation,
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
} from '../types'
import { buildBatchEngineGeometryLayout } from './build-batch-engine-geometry-layout'
import {
  buildStripFirstLayout,
  type StripFirstLayout,
  type StripLayoutZone,
} from './build-strip-first-layout'

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

function buildPlanSummaryLayout(
  selectedPlan: BatchOptimizerPlan,
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
): StripFirstLayout {
  const widthMm = Math.max(selectedPlan.layoutSummary.canvasWidthMm, 1)
  const heightMm = Math.max(selectedPlan.layoutSummary.canvasHeightMm, 1)
  const diffZoneIdSet = new Set(activeDiffSummary?.highlightZoneIds ?? [])
  const zones: StripLayoutZone[] = selectedPlan.layoutSummary.zones.map(
    (zone) => ({
      id: zone.id,
      kind: toCanvasZoneKind(zone.kind),
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      label: zone.label,
      detail: zone.detail || '--',
      usageCategory: zone.usageCategory,
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
    })
  )

  return {
    widthMm,
    heightMm,
    zones,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: widthMm,
      maxY: heightMm,
    },
  }
}

export function buildBatchEngineCanvasLayout(
  controls: BatchEngineNormalizedControls,
  simulation: BatchEngineSimulation,
  selectedPlan?: BatchOptimizerPlan,
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
): StripFirstLayout {
  if (!selectedPlan) {
    return buildStripFirstLayout(controls, simulation)
  }

  return (
    buildBatchEngineGeometryLayout(selectedPlan, activeDiffSummary) ??
    buildPlanSummaryLayout(selectedPlan, activeDiffSummary)
  )
}
