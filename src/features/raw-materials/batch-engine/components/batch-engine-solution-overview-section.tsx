import { Download, FileDown, ScrollText } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary, BatchOptimizerSolveResponse } from '../types'
import {
  exportBatchEngineReviewCsv,
  exportBatchEngineReviewJson,
  printBatchEngineReviewPdf,
} from '../services/export-batch-engine-review'
import { BatchEngineScoreBreakdownPanel } from './batch-engine-score-breakdown-panel'

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
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>{t('rawMaterials.batchEngine.solutionOverview.title')}</p>
      {isSolving ? (
        <p className='mt-3 text-xs font-semibold text-cyan-700'>{t('rawMaterials.batchEngine.solutionOverview.solving')}</p>
      ) : solveError ? (
        <p className='mt-3 text-xs font-semibold text-rose-700'>{solveError}</p>
      ) : solution ? (
        <div className='mt-3 grid gap-4 text-xs font-semibold text-slate-700'>
          <div className='rounded-[20px] border border-slate-200 bg-slate-50/80 p-3'>
            <p>{t('rawMaterials.batchEngine.solutionOverview.summary.solverStatus')}: {solution.summary.solverStatus}</p>
            <p className='mt-1'>{t('rawMaterials.batchEngine.solutionOverview.summary.planCount')}: {solution.summary.planCount}</p>
            <p className='mt-1'>{t('rawMaterials.batchEngine.solutionOverview.summary.message')}: {solution.summary.message}</p>
          </div>

          <div className='grid gap-2'>
            {solution.plans.map((plan) => {
              const selected = plan.rank === selectedPlanRank
              const structuredRuleRiskCount = getStructuredRuleRiskCount(plan)
              const mustRiskCount = plan.mustFulfillDiagnostics.filter((item) => item.status === 'unfulfilled').length
              return (
                <button
                  key={plan.rank}
                  type='button'
                  onClick={() => onSelectPlan(plan.rank)}
                  className={selected
                    ? 'rounded-2xl border border-cyan-300 bg-cyan-50 px-3 py-3 text-left'
                    : 'rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left'}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>
                      #{plan.rank} / {plan.strategyKey}
                    </p>
                    <div className='flex flex-wrap items-center justify-end gap-1'>
                      <span className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'>
                        {selected
                          ? t('rawMaterials.batchEngine.solutionOverview.currentPlan')
                          : t('rawMaterials.batchEngine.solutionOverview.optionalPlan')}
                      </span>
                      <span className={structuredRuleRiskCount > 0
                        ? 'rounded-full border border-amber-200 bg-amber-500/10 px-2 py-1 text-[8px] font-mono text-amber-700'
                        : 'rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono text-emerald-700'}
                      >
                        {t('rawMaterials.batchEngine.solutionOverview.metrics.structuredRuleRisk', { count: structuredRuleRiskCount })}
                      </span>
                      <span className={mustRiskCount > 0
                        ? 'rounded-full border border-rose-200 bg-rose-500/10 px-2 py-1 text-[8px] font-mono text-rose-700'
                        : 'rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-1 text-[8px] font-mono text-emerald-700'}
                      >
                        {t('rawMaterials.batchEngine.solutionOverview.metrics.mustRisk', { count: mustRiskCount })}
                      </span>
                    </div>
                  </div>
                  <div className='mt-2 grid gap-1 text-xs font-semibold text-slate-700'>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.score')}: {plan.score.toFixed(2)}</p>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.utilization')}: {plan.utilizationPercent.toFixed(2)}%</p>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.loss')}: {plan.lossAreaM2.toFixed(3)} m2</p>
                    <p>{t('rawMaterials.batchEngine.solutionOverview.metrics.unfulfilledLines')}: {plan.unfulfilledLines.length}</p>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedPlan ? (
            <div className='rounded-[20px] border border-dashed border-slate-300 bg-white p-3'>
              <p className='text-[10px] font-black uppercase tracking-[0.18em] text-slate-500'>{t('rawMaterials.batchEngine.solutionOverview.currentPlanDetail')}</p>
              <div className='mt-2 grid gap-1'>
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
                <p>{selectedPlan.explanation}</p>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                <button
                  type='button'
                  onClick={() => exportBatchEngineReviewJson(selectedPlan, activeDiffSummary ?? selectedPlan.diffSummary)}
                  className='inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700'
                >
                  <Download className='size-4' />
                  导出 JSON
                </button>
                <button
                  type='button'
                  onClick={() => exportBatchEngineReviewCsv(selectedPlan, activeDiffSummary ?? selectedPlan.diffSummary)}
                  className='inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700'
                >
                  <FileDown className='size-4' />
                  导出 CSV
                </button>
                <button
                  type='button'
                  onClick={() => printBatchEngineReviewPdf(selectedPlan, activeDiffSummary ?? selectedPlan.diffSummary)}
                  className='inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700'
                >
                  <ScrollText className='size-4' />
                  导出 PDF
                </button>
              </div>
            </div>
          ) : null}

          {selectedPlan ? <BatchEngineScoreBreakdownPanel plan={selectedPlan} /> : null}
        </div>
      ) : (
        <p className='mt-3 text-xs font-semibold text-slate-600'>{t('rawMaterials.batchEngine.solutionOverview.empty')}</p>
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
