import { ClipboardCheck, ScrollText } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type {
  BatchEngineSimulation,
  BatchOptimizerPlan,
  BatchOptimizerPlanDiffSummary,
  BatchOptimizerPlanLayoutDemandSummary,
  BatchOptimizerSolveResponse,
} from '../types'
import { BatchEngineDemandReviewSection } from './batch-engine-demand-review-section'
import { BatchEngineDiffReviewSection } from './batch-engine-diff-review-section'
import { BatchEngineMustFulfillReviewSection } from './batch-engine-must-fulfill-review-section'
import { BatchEngineSolutionOverviewSection } from './batch-engine-solution-overview-section'

type BatchEngineSummaryPanelProps = {
  simulation: BatchEngineSimulation
  solution?: BatchOptimizerSolveResponse
  isSolving: boolean
  solveError: string
  selectedPlanRank: number | null
  selectedPlan?: BatchOptimizerPlan
  baselinePlanRank: number | null
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  onSelectPlan: (rank: number) => void
  onSelectBaselinePlan: (rank: number) => void
  demandSearchQuery: string
  onDemandSearchQueryChange: (value: string) => void
  demandFilterMode: 'all' | 'unfulfilled' | 'split' | 'must-fulfill' | 'diff'
  onDemandFilterModeChange: (mode: 'all' | 'unfulfilled' | 'split' | 'must-fulfill' | 'diff') => void
  rollFilterMode: 'all-rolls' | 'used-rolls' | 'related-rolls'
  onRollFilterModeChange: (mode: 'all-rolls' | 'used-rolls' | 'related-rolls') => void
  demandGroupMode: 'status' | 'must-fulfill' | 'usage-type'
  onDemandGroupModeChange: (mode: 'status' | 'must-fulfill' | 'usage-type') => void
  filteredDemandLines: BatchOptimizerPlanLayoutDemandSummary[]
  groupedDemandLines: Array<{ groupKey: string; items: BatchOptimizerPlanLayoutDemandSummary[] }>
  selectedDemandLineId: string
  selectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  onSelectDemandLine: (demandLineId: string) => void
}

export function BatchEngineSummaryPanel(props: BatchEngineSummaryPanelProps) {
  const { t } = useLanguage()
  const {
    simulation,
    solution,
    isSolving,
    solveError,
    selectedPlanRank,
    selectedPlan,
    baselinePlanRank,
    activeDiffSummary,
    onSelectPlan,
    onSelectBaselinePlan,
    demandSearchQuery,
    onDemandSearchQueryChange,
    demandFilterMode,
    onDemandFilterModeChange,
    rollFilterMode,
    onRollFilterModeChange,
    demandGroupMode,
    onDemandGroupModeChange,
    filteredDemandLines,
    groupedDemandLines,
    selectedDemandLineId,
    selectedDemand,
    onSelectDemandLine,
  } = props

  return (
    <section className='rounded-[26px] border border-dashed border-slate-300/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.8))] p-4 shadow-none'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white/85 text-slate-600'>
          <ClipboardCheck className='size-4' />
        </div>
        <div>
          <p className='text-[10px] font-black uppercase tracking-[0.24em] text-slate-500/75'>
            {t('rawMaterials.batchEngine.sections.summary.kicker')}
          </p>
          <h2 className='mt-2 text-base font-black italic tracking-tight text-slate-900'>
            {t('rawMaterials.batchEngine.sections.summary.title')}
          </h2>
          <p className='mt-1 text-xs leading-5 text-slate-600/85'>
            {t('rawMaterials.batchEngine.sections.summary.description')}
          </p>
        </div>
      </div>

      <div className='mt-4 grid gap-4'>
        <div className='rounded-[22px] border border-slate-200 bg-white/85 p-4'>
          <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            <ScrollText className='size-4 text-cyan-700' />
            {t('rawMaterials.batchEngine.sections.summary.cards.output.title')}
          </div>
          {simulation.ready ? (
            <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
              <p>裁纱单据: {simulation.selectedPlanName || '--'}</p>
              <p>总需求行数: {simulation.demandLineCount}</p>
              <p>有效需求行: {simulation.validDemandLineCount}</p>
              <p>总需求块数: {simulation.totalRequiredPieces}</p>
              <p>真实裁片面积: {simulation.totalDemandAreaM2.toFixed(3)} m2</p>
              <p>角度占用面积: {simulation.totalOccupiedAreaM2.toFixed(3)} m2</p>
              <p>利用率（占用口径）: {simulation.utilizationPercent.toFixed(2)}%</p>
              <p>损耗面积（占用口径）: {simulation.lossAreaM2.toFixed(3)} m2</p>
            </div>
          ) : (
            <p className='mt-3 text-sm font-semibold text-slate-800'>
              {simulation.reason || t('rawMaterials.batchEngine.sections.summary.cards.output.value')}
            </p>
          )}
          <p className='mt-1 text-xs leading-5 text-slate-600/80'>
            {t('rawMaterials.batchEngine.sections.summary.cards.output.hint')}
          </p>
        </div>

        <BatchEngineSolutionOverviewSection
          solution={solution}
          isSolving={isSolving}
          solveError={solveError}
          selectedPlanRank={selectedPlanRank}
          selectedPlan={selectedPlan}
          activeDiffSummary={activeDiffSummary}
          onSelectPlan={onSelectPlan}
        />

        {solution?.plans.length ? (
          <BatchEngineDiffReviewSection
            plans={solution.plans}
            selectedPlanRank={selectedPlanRank}
            baselinePlanRank={baselinePlanRank}
            selectedPlan={selectedPlan}
            activeDiffSummary={activeDiffSummary}
            onSelectPlan={onSelectPlan}
            onSelectBaselinePlan={onSelectBaselinePlan}
          />
        ) : null}

        <BatchEngineMustFulfillReviewSection selectedPlan={selectedPlan} />

        {selectedPlan ? (
          <BatchEngineDemandReviewSection
            demandSearchQuery={demandSearchQuery}
            onDemandSearchQueryChange={onDemandSearchQueryChange}
            demandFilterMode={demandFilterMode}
            onDemandFilterModeChange={onDemandFilterModeChange}
            rollFilterMode={rollFilterMode}
            onRollFilterModeChange={onRollFilterModeChange}
            demandGroupMode={demandGroupMode}
            onDemandGroupModeChange={onDemandGroupModeChange}
            filteredDemandLines={filteredDemandLines}
            groupedDemandLines={groupedDemandLines}
            selectedDemandLineId={selectedDemandLineId}
            selectedDemand={selectedDemand}
            onSelectDemandLine={onSelectDemandLine}
          />
        ) : null}
      </div>
    </section>
  )
}
