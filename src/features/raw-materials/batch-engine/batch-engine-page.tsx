import { Blocks } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { BatchEngineConfigDebugPanel } from './components/batch-engine-config-debug-panel'
import { BatchEngineControlPanel } from './components/batch-engine-control-panel'
import { BatchEngineCuttingPreviewDialog } from './components/batch-engine-cutting-preview-dialog'
import { BatchEngineSimulationStage } from './components/batch-engine-simulation-stage'
import { BatchEngineSummaryPanel } from './components/batch-engine-summary-panel'
import { useBatchEnginePreviewFocusState } from './hooks/use-batch-engine-preview-focus-state'
import { useBatchEngineState } from './hooks/use-batch-engine-state'

export function BatchEnginePage() {
  const { t } = useLanguage()
  const { bootstrap, preview, solve, planSelection, demandSelection } = useBatchEngineState()
  const {
    previewOpen,
    selectedExplainabilityTargetId,
    selectedExplainabilityTargetKind,
    selectedExplainabilityTargetSource,
    handlePreviewOpenChange,
    openPreview,
    openExplainabilityTarget,
    selectExplainabilityTarget,
  } = useBatchEnginePreviewFocusState()
  const { selectedPlan, selectedPlanRank, baselinePlanRank, activeDiffSummary } = planSelection

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Blocks}
        title={t('rawMaterials.batchEngine.title')}
      />

      <section className='rounded-[32px] border border-dashed border-border/60 bg-card p-4 shadow-none sm:p-5'>
        <div className='flex flex-col gap-6'>
          <BatchEngineControlPanel
            controls={preview.controls}
            updateControl={preview.updateControl}
            prepregSpecs={bootstrap.prepregSpecs}
            prepregLoading={bootstrap.prepregLoading}
            selectedPrepregSpec={bootstrap.selectedPrepregSpec}
            cuttingPlans={bootstrap.cuttingPlans}
            cuttingPlanLoading={bootstrap.cuttingPlanLoading}
            selectedCuttingPlan={bootstrap.selectedCuttingPlan}
            simulation={preview.simulation}
          />
          <BatchEngineSimulationStage
            legend={preview.legend}
            simulation={preview.simulation}
            canSolve={solve.canSolve}
            solveDisabledReason={solve.solveDisabledReason}
            isSolving={solve.isSolving}
            isResultStale={solve.isResultStale}
            onSolve={solve.solve}
            onOpenPreview={openPreview}
          />
          <BatchEngineConfigDebugPanel
            controls={preview.controls}
            request={solve.request}
            isResultStale={solve.isResultStale}
          />
          <BatchEngineSummaryPanel
            simulation={preview.simulation}
            solution={solve.solution}
            isSolving={solve.isSolving}
            solveError={solve.solveError}
            selectedPlanRank={selectedPlanRank}
            selectedPlan={selectedPlan}
            baselinePlanRank={baselinePlanRank}
            activeDiffSummary={activeDiffSummary}
            onSelectPlan={planSelection.selectPlan}
            onSelectBaselinePlan={planSelection.selectBaselinePlan}
            demandSearchQuery={demandSelection.demandSearchQuery}
            onDemandSearchQueryChange={demandSelection.setDemandSearchQuery}
            demandFilterMode={demandSelection.demandFilterMode}
            onDemandFilterModeChange={demandSelection.setDemandFilterMode}
            rollFilterMode={demandSelection.rollFilterMode}
            onRollFilterModeChange={demandSelection.setRollFilterMode}
            demandGroupMode={demandSelection.demandGroupMode}
            onDemandGroupModeChange={demandSelection.setDemandGroupMode}
            filteredDemandLines={demandSelection.filteredDemandLines}
            groupedDemandLines={demandSelection.groupedDemandLines}
            selectedDemandLineId={demandSelection.selectedDemandLineId}
            selectedDemand={demandSelection.selectedDemand}
            onSelectDemandLine={demandSelection.selectDemandLine}
            onOpenExplainabilityTarget={openExplainabilityTarget}
            selectedExplainabilityTargetId={selectedExplainabilityTargetId}
            selectedExplainabilityTargetKind={selectedExplainabilityTargetKind}
            selectedExplainabilityTargetSource={selectedExplainabilityTargetSource}
          />
        </div>
      </section>

      <BatchEngineCuttingPreviewDialog
        open={previewOpen}
        onOpenChange={handlePreviewOpenChange}
        controls={preview.controls}
        normalizedControls={preview.normalizedControls}
        simulation={preview.simulation}
        selectedPlan={selectedPlan}
        baselinePlanRank={baselinePlanRank}
        activeDiffSummary={activeDiffSummary}
        plans={solve.solution?.plans ?? []}
        explicitSelectedDemandLineId={demandSelection.explicitSelectedDemandLineId}
        explicitSelectedDemand={demandSelection.explicitSelectedDemand}
        effectiveSelectedDemandLineId={demandSelection.effectiveSelectedDemandLineId}
        effectiveSelectedDemand={demandSelection.effectiveSelectedDemand}
        selectedDemandLineId={demandSelection.selectedDemandLineId}
        relatedRollIds={demandSelection.relatedRollIds}
        filteredRollIds={demandSelection.filteredRollIds}
        onSelectBaselinePlan={planSelection.selectBaselinePlan}
        onSelectDemandLine={demandSelection.selectDemandLine}
        selectedExplainabilityTargetId={selectedExplainabilityTargetId}
        selectedExplainabilityTargetKind={selectedExplainabilityTargetKind}
        onSelectExplainabilityTarget={selectExplainabilityTarget}
      />
    </div>
  )
}
