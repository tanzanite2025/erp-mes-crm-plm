import { useBatchEngineBootstrap } from './use-batch-engine-bootstrap'
import { useBatchEngineDemandSelection } from './use-batch-engine-demand-selection'
import { useBatchEnginePageState } from './use-batch-engine-page-state'
import { useBatchEnginePlanSelection } from './use-batch-engine-plan-selection'
import { useBatchEnginePreview } from './use-batch-engine-preview'
import { useBatchEngineSolve } from './use-batch-engine-solve'

export function useBatchEngineState() {
  const { controls: rawControls, updateControl } = useBatchEnginePageState()
  const {
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
    cuttingPlans,
    cuttingPlanLoading,
    selectedCuttingPlan,
    cutSizeUnits,
  } = useBatchEngineBootstrap(rawControls.selectedPrepregSpecId, rawControls.selectedCuttingPlanId)
  const { controls, normalizedControls, mappedDemandLines, simulation, metrics, legend } = useBatchEnginePreview({
    controls: rawControls,
    selectedCuttingPlan,
    cutSizeUnits,
    selectedPrepregSpec,
  })
  const {
    canSolve,
    solveDisabledReason,
    solution,
    isSolving,
    solveError,
    solve,
  } = useBatchEngineSolve({
    controls: normalizedControls,
    selectedCuttingPlan,
    selectedPrepregSpec,
    mappedDemandLines,
    simulation,
  })
  const { selectedPlanContext, selectPlan, selectBaselinePlan } = useBatchEnginePlanSelection({ solution })
  const {
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    rollFilterMode,
    setRollFilterMode,
    demandGroupMode,
    setDemandGroupMode,
    filteredDemandLines,
    groupedDemandLines,
    explicitSelectedDemandLineId,
    explicitSelectedDemand,
    effectiveSelectedDemandLineId,
    effectiveSelectedDemand,
    selectedDemandLineId,
    selectedDemand,
    relatedRollIds,
    filteredRollIds,
    selectDemandLine,
  } = useBatchEngineDemandSelection({
    selectedPlan: selectedPlanContext.selectedPlan,
    activeDiffSummary: selectedPlanContext.activeDiffSummary,
  })

  return {
    bootstrap: {
      prepregSpecs,
      prepregLoading,
      selectedPrepregSpec,
      cuttingPlans,
      cuttingPlanLoading,
      selectedCuttingPlan,
    },
    preview: {
      metrics,
      legend,
      controls,
      normalizedControls,
      updateControl,
      simulation,
    },
    solve: {
      canSolve,
      solveDisabledReason,
      solution,
      isSolving,
      solveError,
      solve,
    },
    planSelection: {
      ...selectedPlanContext,
      selectPlan,
      selectBaselinePlan,
    },
    demandSelection: {
      demandSearchQuery: searchQuery,
      setDemandSearchQuery: setSearchQuery,
      demandFilterMode: filterMode,
      setDemandFilterMode: setFilterMode,
      rollFilterMode,
      setRollFilterMode,
      demandGroupMode,
      setDemandGroupMode,
      filteredDemandLines,
      groupedDemandLines,
      explicitSelectedDemandLineId,
      explicitSelectedDemand,
      effectiveSelectedDemandLineId,
      effectiveSelectedDemand,
      selectedDemandLineId,
      selectedDemand,
      relatedRollIds,
      filteredRollIds,
      selectDemandLine,
    },
  }
}
