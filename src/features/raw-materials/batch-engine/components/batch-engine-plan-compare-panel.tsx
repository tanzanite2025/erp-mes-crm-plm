import { useLanguage } from '@/context/language-provider'
import type { BatchOptimizerPlan } from '../types'
import { getActiveDiffSummary } from '../services/batch-engine-diff'

type BatchEnginePlanComparePanelProps = {
  plans: BatchOptimizerPlan[]
  selectedPlanRank: number | null
  baselinePlanRank: number | null
  onSelectPlan: (rank: number) => void
}

export function BatchEnginePlanComparePanel(props: BatchEnginePlanComparePanelProps) {
  const { t } = useLanguage()
  const { plans, selectedPlanRank, baselinePlanRank, onSelectPlan } = props

  if (!plans.length) {
    return null
  }

  return (
    <div className='rounded-[18px] border border-dashed border-slate-300 bg-white/90 p-3'>
      <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>
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
          return (
            <button
              key={plan.rank}
              type='button'
              onClick={() => onSelectPlan(plan.rank)}
              className={selected
                ? 'rounded-[20px] border border-cyan-300 bg-cyan-50 px-3 py-3 text-left'
                : 'rounded-[20px] border border-slate-200 bg-slate-50/70 px-3 py-3 text-left'}
            >
              <div className='flex items-center justify-between gap-2'>
                <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>
                  #{plan.rank} / {plan.strategyKey}
                </p>
                <div className='flex flex-wrap items-center justify-end gap-1'>
                  <span className='rounded-full border border-slate-200 bg-white px-2 py-1 text-[8px] font-mono text-slate-600'>
                    {t('rawMaterials.batchEngine.comparePanel.scoreChip', { score: plan.score.toFixed(2) })}
                  </span>
                  <span className={plan.comparisonSummary.mustFulfillSatisfied
                    ? 'rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono text-emerald-700'
                    : 'rounded-full border border-rose-200 bg-rose-500/10 px-2 py-1 text-[8px] font-mono text-rose-700'}
                  >
                    {plan.comparisonSummary.mustFulfillSatisfied
                      ? t('rawMaterials.batchEngine.comparePanel.mustOk')
                      : t('rawMaterials.batchEngine.comparePanel.mustRisk')}
                  </span>
                  <span className={structuredRuleRiskCount > 0
                    ? 'rounded-full border border-amber-200 bg-amber-500/10 px-2 py-1 text-[8px] font-mono text-amber-700'
                    : 'rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono text-emerald-700'}
                  >
                    {structuredRuleRiskCount > 0
                      ? t('rawMaterials.batchEngine.comparePanel.ruleRisk', { count: structuredRuleRiskCount })
                      : t('rawMaterials.batchEngine.comparePanel.ruleStable')}
                  </span>
                </div>
              </div>

              <div className='mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700'>
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.utilization')} value={`${plan.utilizationPercent.toFixed(2)}%`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.fulfilledDemand')} value={`${plan.comparisonSummary.fulfilledDemandCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.splitDemand')} value={`${plan.comparisonSummary.splitDemandCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.usedRolls')} value={`${plan.comparisonSummary.usedRollCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.remainingRollArea')} value={`${plan.comparisonSummary.unusedRollAreaM2.toFixed(3)} m2`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.unfulfilledArea')} value={`${plan.comparisonSummary.unfulfilledAreaM2.toFixed(3)} m2`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.fulfilledContribution')} value={`+${plan.scoreBreakdown.fulfilledContribution.toFixed(2)}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.mustPenalty')} value={`-${plan.scoreBreakdown.mustFulfillPenalty.toFixed(2)}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.groupSplit')} value={`${plan.scoreBreakdown.groupSplitCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.sequenceViolation')} value={`${plan.scoreBreakdown.sequenceViolationCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.directionSwitch')} value={`${plan.scoreBreakdown.directionSwitchCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.mixViolation')} value={`${plan.scoreBreakdown.mixViolationCount}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.diffDemand')} value={`${diffSummary.changedDemandLineIds.length}`} />
                <CompareMetric label={t('rawMaterials.batchEngine.comparePanel.metrics.diffZones')} value={`${diffSummary.highlightZoneIds.length}`} />
              </div>

              <div className='mt-3 grid gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>
                <p>{t('rawMaterials.batchEngine.comparePanel.baseline', { rank: diffSummary.baselinePlanRank })}</p>
                <p>{t('rawMaterials.batchEngine.comparePanel.mustDiagnostics', { count: plan.mustFulfillDiagnostics.filter((item) => item.status === 'unfulfilled').length })}</p>
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
      <p className='text-[8px] font-black uppercase tracking-[0.18em] text-slate-400'>{label}</p>
      <p className='mt-1 text-xs font-semibold text-slate-800'>{value}</p>
    </div>
  )
}
