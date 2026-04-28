import { useState } from 'react'
import { Blocks } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { BatchEngineControlPanel } from './components/batch-engine-control-panel'
import { BatchEngineCuttingPreviewDialog } from './components/batch-engine-cutting-preview-dialog'
import { BatchEngineSimulationStage } from './components/batch-engine-simulation-stage'
import { BatchEngineSummaryPanel } from './components/batch-engine-summary-panel'
import { useBatchEngineState } from './hooks/use-batch-engine-state'

export function BatchEnginePage() {
  const { t } = useLanguage()
  const [previewOpen, setPreviewOpen] = useState(false)
  const {
    metrics,
    legend,
    controls,
    updateControl,
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
    cuttingPlans,
    cuttingPlanLoading,
    selectedCuttingPlan,
    simulation,
    canSolve,
    solveDisabledReason,
    solution,
    isSolving,
    solveError,
    solve,
    selectedPlanRank,
    selectedPlan,
    baselinePlanRank,
    activeDiffSummary,
    selectPlan,
    selectBaselinePlan,
    demandSearchQuery,
    setDemandSearchQuery,
    demandFilterMode,
    setDemandFilterMode,
    rollFilterMode,
    setRollFilterMode,
    demandGroupMode,
    setDemandGroupMode,
    filteredDemandLines,
    groupedDemandLines,
    selectedDemandLineId,
    selectedDemand,
    relatedRollIds,
    filteredRollIds,
    selectDemandLine,
  } = useBatchEngineState()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Blocks}
        title={t('rawMaterials.batchEngine.title')}
      />

      <section className='rounded-[32px] border border-dashed border-slate-300/90 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.2)] sm:p-5'>
        <div className='flex flex-col gap-6'>
          <BatchEngineControlPanel
            metrics={metrics}
            controls={controls}
            updateControl={updateControl}
            prepregSpecs={prepregSpecs}
            prepregLoading={prepregLoading}
            selectedPrepregSpec={selectedPrepregSpec}
            cuttingPlans={cuttingPlans}
            cuttingPlanLoading={cuttingPlanLoading}
            selectedCuttingPlan={selectedCuttingPlan}
            simulation={simulation}
          />
          <BatchEngineSimulationStage
            legend={legend}
            simulation={simulation}
            canSolve={canSolve}
            solveDisabledReason={solveDisabledReason}
            isSolving={isSolving}
            onSolve={solve}
            onOpenPreview={() => setPreviewOpen(true)}
          />
          <BatchEngineSummaryPanel
            simulation={simulation}
            solution={solution}
            isSolving={isSolving}
            solveError={solveError}
            selectedPlanRank={selectedPlanRank}
            selectedPlan={selectedPlan}
            baselinePlanRank={baselinePlanRank}
            activeDiffSummary={activeDiffSummary}
            onSelectPlan={selectPlan}
            onSelectBaselinePlan={selectBaselinePlan}
            demandSearchQuery={demandSearchQuery}
            onDemandSearchQueryChange={setDemandSearchQuery}
            demandFilterMode={demandFilterMode}
            onDemandFilterModeChange={setDemandFilterMode}
            rollFilterMode={rollFilterMode}
            onRollFilterModeChange={setRollFilterMode}
            demandGroupMode={demandGroupMode}
            onDemandGroupModeChange={setDemandGroupMode}
            filteredDemandLines={filteredDemandLines}
            groupedDemandLines={groupedDemandLines}
            selectedDemandLineId={selectedDemandLineId}
            selectedDemand={selectedDemand}
            onSelectDemandLine={selectDemandLine}
          />
        </div>
      </section>

      <BatchEngineCuttingPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        controls={controls}
        simulation={simulation}
        selectedPlan={selectedPlan}
        baselinePlanRank={baselinePlanRank}
        activeDiffSummary={activeDiffSummary}
        plans={solution?.plans ?? []}
        selectedDemand={selectedDemand}
        selectedDemandLineId={selectedDemandLineId}
        relatedRollIds={relatedRollIds}
        filteredRollIds={filteredRollIds}
        onSelectBaselinePlan={selectBaselinePlan}
        onSelectDemandLine={selectDemandLine}
      />
    </div>
  )
}
