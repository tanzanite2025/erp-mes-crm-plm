import { useLanguage } from '@/context/language-provider'
import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary, BatchOptimizerSolveResponse } from '../types'
import {
  buildPhase7BreakSliceBadgeLabel,
  buildPhase7BudgetPriorityBadgeLabel,
  buildPhase7BudgetQuotaBadgeLabel,
  buildPhase7BudgetRerankBadgeLabel,
  buildPhase7ZoneClusterBadgeLabel,
} from '../services/batch-engine-phase7-display'
import { BatchEngineExportActions } from './batch-engine-export-actions'
import { BatchEngineScoreBreakdownPanel } from './batch-engine-score-breakdown-panel'
import { BatchEnginePhase7ExplainabilityMetaBadge } from './batch-engine-phase7-explainability-meta-badge'

type BatchEngineSolutionOverviewSectionProps = {
  solution?: BatchOptimizerSolveResponse
  isSolving: boolean
  solveError: string
  selectedPlanRank: number | null
  selectedPlan?: BatchOptimizerPlan
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  onSelectPlan: (rank: number) => void
}

export function BatchEngineSolutionOverviewSection(props: BatchEngineSolutionOverviewSectionProps) {
  const { t } = useLanguage()
  const { solution, isSolving, solveError, selectedPlanRank, selectedPlan, activeDiffSummary, onSelectPlan } = props

  return (
    <div className='rounded-[24px] border border-dashed border-border/60 bg-card p-4'>
      <p className='text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60'>{t('rawMaterials.batchEngine.solutionOverview.title')}</p>
      {isSolving ? (
        <p className='mt-3 text-xs font-semibold text-primary'>{t('rawMaterials.batchEngine.solutionOverview.solving')}</p>
      ) : solveError ? (
        <p className='mt-3 text-xs font-semibold text-destructive'>{solveError}</p>
      ) : solution ? (
        <div className='mt-3 grid gap-4 text-xs font-semibold text-foreground/90'>
          <div className='rounded-[20px] border border-border/40 bg-muted/10 p-3'>
            <p>{t('rawMaterials.batchEngine.solutionOverview.summary.solverStatus')}: {solution.summary.solverStatus}</p>
            <p className='mt-1'>{t('rawMaterials.batchEngine.solutionOverview.summary.planCount')}: {solution.summary.planCount}</p>
            <p className='mt-1'>{t('rawMaterials.batchEngine.solutionOverview.summary.message')}: {solution.summary.message}</p>
          </div>

          <div className='grid gap-2'>
            {solution.plans.map((plan) => {
              const selected = plan.rank === selectedPlanRank
              const structuredRuleRiskCount = getStructuredRuleRiskCount(plan)
              const mustRiskCount = plan.mustFulfillDiagnostics.filter((item) => item.status === 'unfulfilled').length
              const breakSliceCount = plan.explainabilitySummary.breakSlices.length
              const zoneClusterCount = plan.explainabilitySummary.zoneClusters.length
              const dynamicStrategyCount = plan.candidateBudgetSummary.dynamicStrategyStats.length
              return (
                <button
                  key={plan.rank}
                  type='button'
                  onClick={() => onSelectPlan(plan.rank)}
                  className={selected
                    ? 'rounded-2xl border border-primary/40 bg-primary/5 px-3 py-3 text-left'
                    : 'rounded-2xl border border-border/40 bg-muted/5 px-3 py-3 text-left'}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60'>
                      #{plan.rank} / {plan.strategyKey}
                    </p>
                    <div className='flex flex-wrap items-center justify-end gap-1'>
                      <span className='text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70'>
                        {selected
                          ? t('rawMaterials.batchEngine.solutionOverview.currentPlan')
                          : t('rawMaterials.batchEngine.solutionOverview.optionalPlan')}
                      </span>
                      <span className={structuredRuleRiskCount > 0
                        ? 'rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[8px] font-mono text-amber-500'
                        : 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono text-emerald-500'}
                      >
                        {t('rawMaterials.batchEngine.solutionOverview.metrics.structuredRuleRisk', { count: structuredRuleRiskCount })}
                      </span>
                      <span className={mustRiskCount > 0
                        ? 'rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[8px] font-mono text-rose-500'
                        : 'rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono text-emerald-500'}
                      >
                        {t('rawMaterials.batchEngine.solutionOverview.metrics.mustRisk', { count: mustRiskCount })}
                      </span>
                      <BatchEnginePhase7ExplainabilityMetaBadge
                        label={buildPhase7ZoneClusterBadgeLabel(String(zoneClusterCount))}
                        tone={zoneClusterCount > 0 ? 'amber' : 'slate'}
                        compact
                      />
                    </div>
                  </div>
                  <div className='mt-2 grid gap-1 text-xs font-semibold text-muted-foreground/80'>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.score')}: {plan.score.toFixed(2)}</p>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.utilization')}: {plan.utilizationPercent.toFixed(2)}%</p>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.loss')}: {plan.lossAreaM2.toFixed(3)} m2</p>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.unfulfilledLines')}: {plan.unfulfilledLines.length}</p>
                    <p>Break Slice: {breakSliceCount}</p>
                    <p>Zone Cluster: {zoneClusterCount}</p>
                    <p>动态配额策略: {dynamicStrategyCount}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedPlan ? (
            <div className='rounded-[20px] border border-dashed border-border/40 bg-muted/5 p-3'>
              <p className='text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/60'>{t('rawMaterials.batchEngine.solutionOverview.currentPlanDetail')}</p>
              <div className='mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
                <OverviewMetricCard label='Break Slice' value={`${selectedPlan.explainabilitySummary.breakSlices.length}`} tone='violet' />
                <OverviewMetricCard label='Zone Cluster' value={`${selectedPlan.explainabilitySummary.zoneClusters.length}`} tone='amber' />
                <OverviewMetricCard label='动态配额策略' value={`${selectedPlan.candidateBudgetSummary.dynamicStrategyStats.length}`} tone='slate' />
                <OverviewMetricCard label='残料复用命中' value={`${selectedPlan.scoreBreakdown.geometryReuseHitCount}`} tone='emerald' />
              </div>
              <div className='mt-3 grid gap-1 text-foreground/90'>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.strategy')}: {selectedPlan.strategyKey}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.score')}: {selectedPlan.score.toFixed(2)}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.utilization')}: {selectedPlan.utilizationPercent.toFixed(2)}%</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.loss')}: {selectedPlan.lossAreaM2.toFixed(3)} m2</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.assignments')}: {selectedPlan.assignments.length}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.unfulfilledLines')}: {selectedPlan.unfulfilledLines.length}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.splitDemand')}: {selectedPlan.comparisonSummary.splitDemandCount}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.usedRolls')}: {selectedPlan.comparisonSummary.usedRollCount}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.structuredRuleRisk', { count: getStructuredRuleRiskCount(selectedPlan) })}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.groupSplit')}: {selectedPlan.scoreBreakdown.groupSplitCount}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.sequenceViolation')}: {selectedPlan.scoreBreakdown.sequenceViolationCount}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.directionSwitch')}: {selectedPlan.scoreBreakdown.directionSwitchCount}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.mixViolation')}: {selectedPlan.scoreBreakdown.mixViolationCount}</p>
                <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.baseline')}: Top{activeDiffSummary?.baselinePlanRank ?? selectedPlan.diffSummary.baselinePlanRank}</p>
                <p>预算重排: {selectedPlan.budgetRerankReason || '--'}</p>
                <p>{selectedPlan.explanation}</p>
              </div>
              <div className='mt-3 flex flex-wrap items-center gap-1.5'>
                {selectedPlan.explainabilitySummary.breakSlices.slice(0, 2).map((item) => (
                  <BatchEnginePhase7ExplainabilityMetaBadge key={`selected-break-slice-${item.id}`} label={buildPhase7BreakSliceBadgeLabel(item.id)} tone='violet' compact />
                ))}
                {selectedPlan.explainabilitySummary.zoneClusters.slice(0, 2).map((item) => (
                  <BatchEnginePhase7ExplainabilityMetaBadge key={`selected-zone-cluster-${item.clusterId}`} label={buildPhase7ZoneClusterBadgeLabel(item.clusterId)} tone='amber' compact />
                ))}
                {selectedPlan.budgetRerankReason ? <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BudgetRerankBadgeLabel()} tone='amber' compact /> : null}
              </div>
              {selectedPlan.candidateBudgetSummary.dynamicStrategyStats.length ? (
                <div className='mt-3 grid gap-2 xl:grid-cols-2'>
                  {selectedPlan.candidateBudgetSummary.dynamicStrategyStats.slice(0, 4).map((item) => (
                    <div key={`${selectedPlan.rank}-${item.strategyKey}`} className='rounded-[20px] border border-dashed border-border/40 bg-muted/10 p-3'>
                      <p className='text-[8px] font-black uppercase tracking-[0.18em] text-muted-foreground/60'>{item.strategyKey}</p>
                      <div className='mt-2 flex flex-wrap items-center gap-1.5'>
                        <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BudgetQuotaBadgeLabel(item.targetQuota)} tone='amber' compact />
                        <BatchEnginePhase7ExplainabilityMetaBadge label={buildPhase7BudgetPriorityBadgeLabel(item.priorityScore)} tone='slate' compact />
                      </div>
                      <div className='mt-2 grid gap-1 text-xs font-semibold text-muted-foreground/80'>
                        <p>Target Quota: {item.targetQuota}</p>
                        <p>Kept Count: {item.keptCount}</p>
                        <p>Priority: {item.priorityScore.toFixed(2)}</p>
                        <p>{item.rerankReason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <BatchEngineExportActions plan={selectedPlan} diffSummary={activeDiffSummary ?? selectedPlan.diffSummary} />
            </div>
          ) : null}

          {selectedPlan ? <BatchEngineScoreBreakdownPanel plan={selectedPlan} /> : null}
        </div>
      ) : (
        <div className='mt-3 rounded-[20px] border border-dashed border-border/40 bg-muted/5 p-6 text-center'>
          <p className='text-xs font-semibold text-muted-foreground/60'>{t('rawMaterials.batchEngine.solutionOverview.empty')}</p>
        </div>
      )}
    </div>
  )
}

function getStructuredRuleRiskCount(plan: BatchOptimizerPlan) {
  return (
    plan.scoreBreakdown.groupSplitCount +
    plan.scoreBreakdown.sequenceViolationCount +
    plan.scoreBreakdown.directionSwitchCount +
    plan.scoreBreakdown.mixViolationCount
  )
}

function OverviewMetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'violet' | 'amber' | 'slate' | 'emerald'
}) {
  const className = tone === 'violet'
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
