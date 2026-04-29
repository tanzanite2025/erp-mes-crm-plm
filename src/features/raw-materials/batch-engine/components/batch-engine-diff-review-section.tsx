import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'
import type { ReactNode } from 'react'
import {
  buildPhase7BreakSliceBadgeLabel,
  buildPhase7BudgetPriorityBadgeLabel,
  buildPhase7BudgetQuotaBadgeLabel,
  buildPhase7BudgetRerankBadgeLabel,
  buildPhase7DensityBadgeLabel,
  buildPhase7SeverityBadgeLabel,
  buildPhase7ZoneClusterBadgeLabel,
} from '../services/batch-engine-phase7-display'
import { BatchEngineDiffBaselineSelector } from './batch-engine-diff-baseline-selector'
import { BatchEnginePhase7ExplainabilityMetaBadge } from './batch-engine-phase7-explainability-meta-badge'
import { BatchEnginePlanComparePanel } from './batch-engine-plan-compare-panel'

type BatchEngineDiffReviewSectionProps = {
  plans: BatchOptimizerPlan[]
  selectedPlanRank: number | null
  baselinePlanRank: number | null
  selectedPlan?: BatchOptimizerPlan
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  onSelectPlan: (rank: number) => void
  onSelectBaselinePlan: (rank: number) => void
}

export function BatchEngineDiffReviewSection(props: BatchEngineDiffReviewSectionProps) {
  const {
    plans,
    selectedPlanRank,
    baselinePlanRank,
    selectedPlan,
    activeDiffSummary,
    onSelectPlan,
    onSelectBaselinePlan,
  } = props

  if (!plans.length) {
    return null
  }

  return (
    <div className='grid gap-4'>
      <BatchEnginePlanComparePanel
        plans={plans}
        selectedPlanRank={selectedPlanRank}
        baselinePlanRank={baselinePlanRank}
        onSelectPlan={onSelectPlan}
      />

      <BatchEngineDiffBaselineSelector
        plans={plans}
        baselinePlanRank={baselinePlanRank}
        onChangeBaselinePlan={onSelectBaselinePlan}
      />

      {selectedPlan ? (
        <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
          <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>候选差异摘要</p>
          <div className='mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
            <DiffMetricCard label='差异热区' value={`${(activeDiffSummary ?? selectedPlan.diffSummary).highlightZoneIds.length}`} tone='rose' />
            <DiffMetricCard label='Break Slice' value={`${selectedPlan.explainabilitySummary.breakSlices.length}`} tone='violet' />
            <DiffMetricCard label='Zone Cluster' value={`${selectedPlan.explainabilitySummary.zoneClusters.length}`} tone='amber' />
            <DiffMetricCard label='动态配额策略' value={`${selectedPlan.candidateBudgetSummary.dynamicStrategyStats.length}`} tone='slate' />
            <DiffMetricCard label='候选预算' value={`${selectedPlan.candidateBudgetSummary.mergedCandidateCount}/${selectedPlan.candidateBudgetSummary.globalBudget}`} tone='slate' />
            <DiffMetricCard label='相邻破坏' value={`${selectedPlan.reportSummary.adjacencyBreakCount}`} tone='amber' />
            <DiffMetricCard label='切卷次数' value={`${selectedPlan.reportSummary.rollSwitchCount}`} tone='amber' />
            <DiffMetricCard label='残料复用命中' value={`${selectedPlan.reportSummary.geometryReuseHitCount}`} tone='emerald' />
          </div>

          <div className='mt-4 grid gap-3 xl:grid-cols-3'>
            <DetailPanel
              title='差异基线'
              rows={[
                {
                  key: 'added-zones',
                  content: <p>新增区域: {(activeDiffSummary ?? selectedPlan.diffSummary).addedZoneIds.length}</p>,
                },
                {
                  key: 'removed-zones',
                  content: <p>移除区域: {(activeDiffSummary ?? selectedPlan.diffSummary).removedZoneIds.length}</p>,
                },
                {
                  key: 'changed-demand-lines',
                  content: <p>变化需求: {(activeDiffSummary ?? selectedPlan.diffSummary).changedDemandLineIds.join(', ') || '--'}</p>,
                },
                {
                  key: 'changed-rolls',
                  content: <p>变化卷材: {(activeDiffSummary ?? selectedPlan.diffSummary).changedRollIds.join(', ') || '--'}</p>,
                },
              ]}
            />
            <DetailPanel
              title='Break Slice / Cluster'
              rows={[
                {
                  key: 'break-reasons',
                  content: <p>连续段诊断: {selectedPlan.explainabilitySummary.primaryBreakReasons.join(' / ') || '--'}</p>,
                },
                ...selectedPlan.explainabilitySummary.breakSlices.slice(0, 2).map((item) => ({
                  key: `break-slice-${item.id}`,
                  content: (
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BreakSliceBadgeLabel(item.id)} tone='violet' compact />
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7SeverityBadgeLabel(item.severityScore)} tone='rose' compact />
                      {item.clusterId ? <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7ZoneClusterBadgeLabel(item.clusterId)} tone='amber' compact /> : null}
                    </div>
                  ),
                })),
                ...selectedPlan.explainabilitySummary.zoneClusters.slice(0, 2).map((item) => ({
                  key: `zone-cluster-${item.clusterId}`,
                  content: (
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7ZoneClusterBadgeLabel(item.clusterId)} tone='amber' compact />
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7DensityBadgeLabel(item.densityScore)} tone='slate' compact />
                      <span>{item.dominantReason}</span>
                    </div>
                  ),
                })),
              ]}
            />
            <DetailPanel
              title='动态预算重排'
              rows={[
                {
                  key: 'search-preset',
                  content: <p>搜索预设: {selectedPlan.searchConfig.presetKey}</p>,
                },
                {
                  key: 'beam-width',
                  content: <p>Beam Width: {selectedPlan.searchConfig.beamWidth}</p>,
                },
                {
                  key: 'budget-rerank-reason',
                  content: (
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BudgetRerankBadgeLabel()} tone='amber' compact />
                      <span>{selectedPlan.budgetRerankReason || '--'}</span>
                    </div>
                  ),
                },
                ...selectedPlan.candidateBudgetSummary.dynamicStrategyStats.slice(0, 2).map((item) => ({
                  key: `dynamic-strategy-${item.strategyKey}`,
                  content: (
                    <div className='flex flex-wrap items-center gap-1.5'>
                      <span>{item.strategyKey}</span>
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BudgetQuotaBadgeLabel(item.targetQuota)} tone='amber' compact />
                      <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BudgetPriorityBadgeLabel(item.priorityScore)} tone='slate' compact />
                    </div>
                  ),
                })),
              ]}
            />
          </div>

          <div className='mt-4 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/70 p-3 text-xs font-semibold text-slate-700'>
            热区归因: {selectedPlan.explainabilitySummary.heatZoneAttributions.slice(0, 3).map((item) => `${item.zoneId}:${item.reason}`).join(' / ') || '--'}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DiffMetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'rose' | 'violet' | 'amber' | 'emerald' | 'slate'
}) {
  const className = tone === 'rose'
    ? 'border-rose-200 bg-rose-500/10 text-rose-700'
    : tone === 'violet'
      ? 'border-violet-200 bg-violet-500/10 text-violet-700'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-500/10 text-amber-700'
        : tone === 'emerald'
          ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700'
          : 'border-slate-200 bg-slate-50/80 text-slate-700'
  return (
    <div className={`rounded-[20px] border border-dashed px-3 py-3 ${className}`}>
      <p className='text-[8px] font-black uppercase tracking-[0.18em] opacity-70'>{label}</p>
      <p className='mt-2 text-sm font-black'>{value}</p>
    </div>
  )
}

function DetailPanel({ title, rows }: { title: string; rows: { key: string; content: ReactNode }[] }) {
  return (
    <div className='rounded-[20px] border border-dashed border-slate-200 bg-white/95 p-3'>
      <p className='text-[8px] font-black uppercase tracking-[0.18em] text-slate-500'>{title}</p>
      <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
        {rows.map((row) => (
          <div key={row.key}>{row.content}</div>
        ))}
      </div>
    </div>
  )
}
