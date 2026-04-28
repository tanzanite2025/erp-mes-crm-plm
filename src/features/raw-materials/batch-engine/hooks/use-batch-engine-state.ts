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
    cutSizeLoading,
  } = useBatchEngineBootstrap(rawControls.selectedPrepregSpecId, rawControls.selectedCuttingPlanId)
  const { controls, mappedDemandLines, simulation, metrics, legend } = useBatchEnginePreview({
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
    solveAsync,
    resetSolution,
  } = useBatchEngineSolve({
    controls,
    selectedCuttingPlan,
    selectedPrepregSpec,
    mappedDemandLines,
    simulation,
  })
  const { selectedPlanRank, selectedPlan, baselinePlanRank, activeDiffSummary, selectPlan, selectBaselinePlan } = useBatchEnginePlanSelection({ solution })
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
    selectedDemandLineId,
    selectedDemand,
    relatedRollIds,
    highlightedZoneIds,
    changedDemandLineIds,
    filteredRollIds,
    selectDemandLine,
  } = useBatchEngineDemandSelection({ selectedPlan, activeDiffSummary })

  return {
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
    cutSizeUnits,
    cutSizeLoading,
    mappedDemandLines,
    simulation,
    canSolve,
    solveDisabledReason,
    solution,
    isSolving,
    solveError,
    solve,
    solveAsync,
    resetSolution,
    selectedPlanRank,
    selectedPlan,
    baselinePlanRank,
    activeDiffSummary,
    selectPlan,
    selectBaselinePlan,
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
    selectedDemandLineId,
    selectedDemand,
    relatedRollIds,
    highlightedZoneIds,
    changedDemandLineIds,
    filteredRollIds,
    selectDemandLine,
  }
}
