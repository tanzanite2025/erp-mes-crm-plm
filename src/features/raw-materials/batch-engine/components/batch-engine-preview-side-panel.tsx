import type { BatchEngineExplainabilityTargetKind } from '../services/batch-engine-phase7-visualization'
import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import type {
  BatchOptimizerPlan,
  BatchOptimizerPlanLayoutDemandSummary,
} from '../types'
import { BatchEngineDiffBaselineSelector } from './batch-engine-diff-baseline-selector'
import { BatchEnginePreviewDemandDetailCard } from './batch-engine-preview-demand-detail-card'
import { BatchEnginePreviewDiffSummaryCard } from './batch-engine-preview-diff-summary-card'
import { BatchEnginePreviewExplainabilityLinksCard } from './batch-engine-preview-explainability-links-card'
import { BatchEnginePreviewLossBreakdownCard } from './batch-engine-preview-loss-breakdown-card'
import { BatchEnginePreviewMustDiagnosticsCard } from './batch-engine-preview-must-diagnostics-card'
import { BatchEnginePreviewPlanOverviewCard } from './batch-engine-preview-plan-overview-card'
import { BatchEnginePreviewRollSummaryCard } from './batch-engine-preview-roll-summary-card'
import { BatchEngineScoreBreakdownPanel } from './batch-engine-score-breakdown-panel'

type BatchEnginePreviewSidePanelProps = {
  displayState: BatchEnginePreviewDisplayState
  plans: BatchOptimizerPlan[]
  baselinePlanRank: number | null
  explicitSelectedDemandLineId: string
  explicitSelectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  effectiveSelectedDemandLineId: string
  effectiveSelectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  relatedRollIds: string[]
  filteredRollIds: string[]
  onSelectBaselinePlan: (rank: number) => void
  selectedExplainabilityTargetId: string
  selectedExplainabilityTargetKind: BatchEngineExplainabilityTargetKind
  onSelectExplainabilityTarget: (
    targetId: string,
    targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''>
  ) => void
}

export function BatchEnginePreviewSidePanel(
  props: BatchEnginePreviewSidePanelProps
) {
  const {
    displayState,
    plans,
    baselinePlanRank,
    explicitSelectedDemandLineId,
    explicitSelectedDemand,
    effectiveSelectedDemandLineId,
    effectiveSelectedDemand,
    relatedRollIds,
    filteredRollIds,
    onSelectBaselinePlan,
    selectedExplainabilityTargetId,
    selectedExplainabilityTargetKind,
    onSelectExplainabilityTarget,
  } = props
  const { selectedPlan } = displayState

  return (
    <div className='border-t border-dashed border-slate-200 bg-slate-50/70 p-3 xl:border-t-0 xl:border-l'>
      <div className='flex flex-col gap-3'>
        <BatchEnginePreviewPlanOverviewCard displayState={displayState} />

        <BatchEngineDiffBaselineSelector
          plans={plans}
          baselinePlanRank={baselinePlanRank}
          onChangeBaselinePlan={onSelectBaselinePlan}
        />

        <BatchEnginePreviewLossBreakdownCard displayState={displayState} />

        <BatchEnginePreviewDemandDetailCard
          explicitSelectedDemandLineId={explicitSelectedDemandLineId}
          explicitSelectedDemand={explicitSelectedDemand}
          effectiveSelectedDemandLineId={effectiveSelectedDemandLineId}
          effectiveSelectedDemand={effectiveSelectedDemand}
        />

        <BatchEnginePreviewRollSummaryCard
          displayState={displayState}
          relatedRollIds={relatedRollIds}
          filteredRollIds={filteredRollIds}
        />

        {selectedPlan ? (
          <BatchEngineScoreBreakdownPanel plan={selectedPlan} compact />
        ) : null}

        <BatchEnginePreviewMustDiagnosticsCard displayState={displayState} />

        <BatchEnginePreviewDiffSummaryCard displayState={displayState} />

        <BatchEnginePreviewExplainabilityLinksCard
          displayState={displayState}
          title='Break Slice 联动'
          emptyText='当前方案没有 break slice 归因。'
          previewText='本地 preview 不包含 break slice 联动信息。'
          items={selectedPlan?.explainabilitySummary.breakSlices
            .slice(0, 6)
            .map((item) => ({
              key: item.id,
              active:
                selectedExplainabilityTargetKind === 'break-slice' &&
                selectedExplainabilityTargetId === item.id,
              onClick: () =>
                onSelectExplainabilityTarget(item.id, 'break-slice'),
              content: (
                <>
                  <p>
                    {item.segmentKind}:{item.segmentKey}
                  </p>
                  <p className='mt-1'>
                    位置: {item.breakBeforeDemandLineId || '--'} →{' '}
                    {item.breakAfterDemandLineId || '--'}
                  </p>
                  <p className='mt-1'>
                    Severity: {item.severityScore.toFixed(2)} / 热区{' '}
                    {item.zoneIds.length}
                  </p>
                </>
              ),
            }))}
          activeClassName='rounded-2xl border border-violet-300 bg-violet-500/10 px-3 py-3 text-left text-xs font-semibold text-violet-800'
          idleClassName='rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-left text-xs font-semibold text-slate-700'
        />

        <BatchEnginePreviewExplainabilityLinksCard
          displayState={displayState}
          title='Zone Cluster 联动'
          emptyText='当前方案没有 zone cluster 归因。'
          previewText='本地 preview 不包含 zone cluster 联动信息。'
          items={selectedPlan?.explainabilitySummary.zoneClusters
            .slice(0, 6)
            .map((item) => ({
              key: item.clusterId,
              active:
                selectedExplainabilityTargetKind === 'zone-cluster' &&
                selectedExplainabilityTargetId === item.clusterId,
              onClick: () =>
                onSelectExplainabilityTarget(item.clusterId, 'zone-cluster'),
              content: (
                <>
                  <p>{item.clusterId}</p>
                  <p className='mt-1'>主因: {item.dominantReason || '--'}</p>
                  <p className='mt-1'>
                    主需求: {item.dominantDemandLineId || '--'}
                  </p>
                  <p className='mt-1'>
                    Density: {item.densityScore.toFixed(2)} / 热区{' '}
                    {item.zoneIds.length}
                  </p>
                </>
              ),
            }))}
          activeClassName='rounded-2xl border border-amber-300 bg-amber-500/10 px-3 py-3 text-left text-xs font-semibold text-amber-800'
          idleClassName='rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-left text-xs font-semibold text-slate-700'
        />
      </div>
    </div>
  )
}
