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
  utilizationWeight: '55',
  stabilityWeight: '10',
  splitPenaltyWeight: '6',
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
