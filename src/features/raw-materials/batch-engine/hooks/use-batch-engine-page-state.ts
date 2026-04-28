import { useState } from 'react'
import type { BatchEngineControls } from '../types'

export const DEFAULT_BATCH_ENGINE_CONTROLS: BatchEngineControls = {
  selectedPrepregSpecId: '',
  selectedCuttingPlanId: '',
  rollWidthMm: '',
  rollLengthM: '',
  knifeGapMm: '2',
  edgeTrimMm: '0',
  objectivePreset: 'yield-first',
  fulfilledWeight: '35',
  utilizationWeight: '55',
  stabilityWeight: '10',
  assignmentPenaltyWeight: '4',
  unfulfilledPenaltyWeight: '12',
  splitPenaltyWeight: '6',
  mustPenaltyWeight: '45',
}

export function useBatchEnginePageState() {
  const [controls, setControls] = useState<BatchEngineControls>(DEFAULT_BATCH_ENGINE_CONTROLS)

  const updateControl = <K extends keyof BatchEngineControls>(key: K, value: BatchEngineControls[K]) => {
    setControls((current) => ({ ...current, [key]: value }))
  }

  return {
    controls,
    updateControl,
  }
}
