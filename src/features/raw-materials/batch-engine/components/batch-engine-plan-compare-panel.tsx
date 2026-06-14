import type { ReactNode } from 'react'
import { useLanguage } from '@/context/language-provider'
import { getActiveDiffSummary } from '../services/batch-engine-diff'
import {
  buildPhase7BreakSliceBadgeLabel,
  buildPhase7BudgetQuotaBadgeLabel,
  buildPhase7ZoneClusterBadgeLabel,
} from '../services/batch-engine-phase7-display'
import type { BatchOptimizerPlan } from '../types'
import { BatchEnginePhase7ExplainabilityMetaBadge } from './batch-engine-phase7-explainability-meta-badge'

type BatchEnginePlanComparePanelProps = {
  plans: BatchOptimizerPlan[]
  selectedPlanRank: number | null
  baselinePlanRank: number | null
  onSelectPlan: (rank: number) => void
}

export function BatchEnginePlanComparePanel(
  props: BatchEnginePlanComparePanelProps
) {
  const { t } = useLanguage()
  const { plans, selectedPlanRank, baselinePlanRank, onSelectPlan } = props

  if (!plans.length) {
    return null
  }

  return (
    <div className='rounded-[18px] border border-dashed border-slate-300 bg-white/90 p-3'>
      <p className='text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase'>
        {t('rawMaterials.batchEngine.comparePanel.title')}
      </p>
      <div className='mt-3 grid gap-2'>
        {plans.map((plan) => {
          const selected = plan.rank === selectedPlanRank
          const diffSummary = getActiveDiffSummary(plan, baselinePlanRank)
          const structuredRuleRiskCount =
            plan.scoreBreakdown.groupSplitCount +
            plan.scoreBreakdown.sequenceViolationCount +
            plan.scoreBreakdown.directionSwitchCount +
            plan.scoreBreakdown.mixViolationCount
          const breakSliceCount = plan.explainabilitySummary.breakSlices.length
          const zoneClusterCount =
            plan.explainabilitySummary.zoneClusters.length
          const topClusterDensity =
            plan.explainabilitySummary.zoneClusters[0]?.densityScore ?? 0
          const dynamicStrategyStats =
            plan.candidateBudgetSummary.dynamicStrategyStats.slice(0, 2)
          return (
            <button
              key={plan.rank}
              type='button'
              onClick={() => onSelectPlan(plan.rank)}
              className={
                selected
                  ? 'rounded-[20px] border border-cyan-300 bg-cyan-50 px-3 py-3 text-left'
                  : 'rounded-[20px] border border-slate-200 bg-slate-50/70 px-3 py-3 text-left'
              }
            >
              <div className='flex items-center justify-between gap-2'>
                <p className='text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase'>
                  #{plan.rank} / {plan.strategyKey}
                </p>
                <div className='flex flex-wrap items-center justify-end gap-1'>
                  <span className='rounded-full border border-slate-200 bg-white px-2 py-1 font-mono text-[8px] text-slate-600'>
                    {t('rawMaterials.batchEngine.comparePanel.scoreChip', {
                      score: plan.score.toFixed(2),
                    })}
                  </span>
                  <span
                    className={
                      plan.comparisonSummary.mustFulfillSatisfied
                        ? 'rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-1 font-mono text-[8px] text-emerald-700'
                        : 'rounded-full border border-rose-200 bg-rose-500/10 px-2 py-1 font-mono text-[8px] text-rose-700'
                    }
                  >
                    {plan.comparisonSummary.mustFulfillSatisfied
                      ? t('rawMaterials.batchEngine.comparePanel.mustOk')
                      : t('rawMaterials.batchEngine.comparePanel.mustRisk')}
                  </span>
                  <span
                    className={
                      structuredRuleRiskCount > 0
                        ? 'rounded-full border border-amber-200 bg-amber-500/10 px-2 py-1 font-mono text-[8px] text-amber-700'
                        : 'rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-1 font-mono text-[8px] text-emerald-700'
                    }
                  >
                    {structuredRuleRiskCount > 0
                      ? t('rawMaterials.batchEngine.comparePanel.ruleRisk', {
                          count: structuredRuleRiskCount,
                        })
                      : t('rawMaterials.batchEngine.comparePanel.ruleStable')}
                  </span>
                  <BatchEnginePhase7ExplainabilityMetaBadge
                    label={buildPhase7ZoneClusterBadgeLabel(
                      String(zoneClusterCount)
                    )}
                    tone={zoneClusterCount > 0 ? 'amber' : 'slate'}
                    compact
                  />
                </div>
              </div>

              <div className='mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700'>
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.utilization'
                  )}
                  value={`${plan.utilizationPercent.toFixed(2)}%`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.fulfilledDemand'
                  )}
                  value={`${plan.comparisonSummary.fulfilledDemandCount}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.splitDemand'
                  )}
                  value={`${plan.comparisonSummary.splitDemandCount}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.usedRolls'
                  )}
                  value={`${plan.comparisonSummary.usedRollCount}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.remainingRollArea'
                  )}
                  value={`${plan.comparisonSummary.unusedRollAreaM2.toFixed(3)} m2`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.unfulfilledArea'
                  )}
                  value={`${plan.comparisonSummary.unfulfilledAreaM2.toFixed(3)} m2`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.fulfilledContribution'
                  )}
                  value={`+${plan.scoreBreakdown.fulfilledContribution.toFixed(2)}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.mustPenalty'
                  )}
                  value={`-${plan.scoreBreakdown.mustFulfillPenalty.toFixed(2)}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.groupSplit'
                  )}
                  value={`${plan.scoreBreakdown.groupSplitCount}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.sequenceViolation'
                  )}
                  value={`${plan.scoreBreakdown.sequenceViolationCount}`}
                />
                <CompareMetric
                  label='相邻破坏'
                  value={`${plan.scoreBreakdown.adjacencyBreakCount}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.directionSwitch'
                  )}
                  value={`${plan.scoreBreakdown.directionSwitchCount}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.mixViolation'
                  )}
                  value={`${plan.scoreBreakdown.mixViolationCount}`}
                />
                <CompareMetric
                  label='切卷次数'
                  value={`${plan.scoreBreakdown.rollSwitchCount}`}
                />
                <CompareMetric
                  label='残料复用命中'
                  value={`${plan.scoreBreakdown.geometryReuseHitCount}`}
                />
                <CompareMetric
                  label='可复用残料'
                  value={`${plan.scoreBreakdown.reusableResidualAreaM2.toFixed(6)} m2`}
                />
                <CompareMetric
                  label='搜索预设'
                  value={plan.searchConfig.presetKey}
                />
                <CompareMetric
                  label='搜索深度'
                  value={`${plan.searchConfig.maxSearchDepth}`}
                />
                <CompareMetric
                  label='候选预算'
                  value={`${plan.candidateBudgetSummary.mergedCandidateCount}/${plan.candidateBudgetSummary.globalBudget}`}
                />
                <CompareMetric
                  label='Break Slice'
                  value={`${breakSliceCount}`}
                />
                <CompareMetric
                  label='Zone Cluster'
                  value={`${zoneClusterCount}`}
                />
                <CompareMetric
                  label='Cluster 密度峰值'
                  value={
                    topClusterDensity ? topClusterDensity.toFixed(2) : '--'
                  }
                />
                <CompareMetric
                  label='动态配额策略'
                  value={`${plan.candidateBudgetSummary.dynamicStrategyStats.length}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.diffDemand'
                  )}
                  value={`${diffSummary.changedDemandLineIds.length}`}
                />
                <CompareMetric
                  label={t(
                    'rawMaterials.batchEngine.comparePanel.metrics.diffZones'
                  )}
                  value={`${diffSummary.highlightZoneIds.length}`}
                />
              </div>

              <div className='mt-3 grid gap-2 lg:grid-cols-3'>
                <CompareSummaryBlock
                  title={t('rawMaterials.batchEngine.comparePanel.baseline', {
                    rank: diffSummary.baselinePlanRank,
                  })}
                  content={t(
                    'rawMaterials.batchEngine.comparePanel.mustDiagnostics',
                    {
                      count: plan.mustFulfillDiagnostics.filter(
                        (item) => item.status === 'unfulfilled'
                      ).length,
                    }
                  )}
                  tone='slate'
                />
                <CompareSummaryBlock
                  title='Break Summary'
                  content={
                    <div className='grid gap-2'>
                      <p>
                        {plan.explainabilitySummary.primaryBreakReasons.join(
                          ' / '
                        ) || '连续段稳定'}
                      </p>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        {plan.explainabilitySummary.breakSlices
                          .slice(0, 2)
                          .map((item) => (
                            <BatchEnginePhase7ExplainabilityMetaBadge
                              key={`break-slice-${item.id}`}
                              label={buildPhase7BreakSliceBadgeLabel(item.id)}
                              tone='violet'
                              compact
                            />
                          ))}
                        {plan.explainabilitySummary.zoneClusters
                          .slice(0, 1)
                          .map((item) => (
                            <BatchEnginePhase7ExplainabilityMetaBadge
                              key={`zone-cluster-${item.clusterId}`}
                              label={buildPhase7ZoneClusterBadgeLabel(
                                item.clusterId
                              )}
                              tone='amber'
                              compact
                            />
                          ))}
                      </div>
                    </div>
                  }
                  tone='violet'
                />
                <CompareSummaryBlock
                  title='Budget Rerank'
                  content={
                    <div className='grid gap-2'>
                      <p>
                        {plan.budgetRerankReason ||
                          dynamicStrategyStats
                            .map(
                              (item) =>
                                `${item.strategyKey}:${item.targetQuota}`
                            )
                            .join(' / ') ||
                          '动态预算稳定'}
                      </p>
                      <div className='flex flex-wrap items-center gap-1.5'>
                        {dynamicStrategyStats.map((item) => (
                          <BatchEnginePhase7ExplainabilityMetaBadge
                            key={`dynamic-budget-${item.strategyKey}`}
                            label={buildPhase7BudgetQuotaBadgeLabel(
                              item.targetQuota
                            )}
                            tone='amber'
                            compact
                          />
                        ))}
                      </div>
                    </div>
                  }
                  tone='amber'
                />
              </div>

              {dynamicStrategyStats.length ? (
                <div className='mt-3 grid gap-2 lg:grid-cols-2'>
                  {dynamicStrategyStats.map((item) => (
                    <div
                      key={`${plan.rank}-${item.strategyKey}`}
                      className='rounded-2xl border border-dashed border-slate-200 bg-white/90 px-3 py-3'
                    >
                      <p className='text-[8px] font-black tracking-[0.18em] text-slate-500 uppercase'>
                        Dynamic Budget
                      </p>
                      <p className='mt-1 text-[10px] font-black tracking-[0.18em] text-slate-800 uppercase'>
                        {item.strategyKey}
                      </p>
                      <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
                        <p>Target: {item.targetQuota}</p>
                        <p>Kept: {item.keptCount}</p>
                        <p>Priority: {item.priorityScore.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className='mt-3 grid gap-1 text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase'>
                <p>
                  {plan.explainabilitySummary.heatZoneAttributions
                    .slice(0, 2)
                    .map((item) => `${item.zoneId}:${item.segmentKind}`)
                    .join(' / ') || '热区归因稳定'}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CompareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-slate-200 bg-white px-3 py-2'>
      <p className='text-[8px] font-black tracking-[0.18em] text-slate-400 uppercase'>
        {label}
      </p>
      <p className='mt-1 text-xs font-semibold text-slate-800'>{value}</p>
    </div>
  )
}

function CompareSummaryBlock({
  title,
  content,
  tone,
}: {
  title: string
  content: ReactNode
  tone: 'slate' | 'violet' | 'amber'
}) {
  const className =
    tone === 'violet'
      ? 'border-violet-200 bg-violet-500/5 text-violet-800'
      : tone === 'amber'
        ? 'border-amber-200 bg-amber-500/5 text-amber-800'
        : 'border-slate-200 bg-slate-50/70 text-slate-800'
  return (
    <div
      className={`rounded-[20px] border border-dashed px-3 py-3 ${className}`}
    >
      <p className='text-[8px] font-black tracking-[0.18em] uppercase opacity-70'>
        {title}
      </p>
      <div className='mt-2 text-xs leading-5 font-semibold'>{content}</div>
    </div>
  )
}
