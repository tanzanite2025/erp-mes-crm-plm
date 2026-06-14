import { useMemo, useState } from 'react'
import {
  DEFAULT_CUTTING_ENGINE_CONFIG,
  type CuttingEngineConfig,
} from '../../engine-config/types'
import { useCuttingEngineConfigStore } from '../../engine-config/use-cutting-engine-config-store'
import type { BatchEngineControls } from '../types'

function buildBatchEngineControlsFromConfig(
  config: CuttingEngineConfig
): BatchEngineControls {
  return {
    selectedPrepregSpecId: '',
    selectedCuttingPlanId: '',
    rollWidthMm: '',
    rollLengthM: '',
    knifeGapMm: config.knifeGapMm,
    edgeTrimMm: config.edgeTrimMm,
    maxSolveDurationSeconds: config.maxSolveDurationSeconds,
    splitPenaltyWeight: config.splitPenaltyWeight,
    mustFulfillPenaltyWeight: config.mustFulfillPenaltyWeight,
    directionSwitchPenaltyWeight: config.directionSwitchPenaltyWeight,
    sameDirectionPreferred: config.sameDirectionPreferred,
    angleMixMode: config.angleMixMode,
    ruleStrategy: config.ruleStrategy,
    minSupportedLengthMm: config.minSupportedLengthMm,
    maxSupportedLengthMm: config.maxSupportedLengthMm,
    fixedDecisionLengthMm: config.fixedDecisionLengthMm,
  }
}

export const DEFAULT_BATCH_ENGINE_CONTROLS: BatchEngineControls =
  buildBatchEngineControlsFromConfig(DEFAULT_CUTTING_ENGINE_CONFIG)

const ENGINE_CONFIG_CONTROL_KEYS = new Set<keyof BatchEngineControls>([
  'knifeGapMm',
  'edgeTrimMm',
  'maxSolveDurationSeconds',
  'splitPenaltyWeight',
  'mustFulfillPenaltyWeight',
  'directionSwitchPenaltyWeight',
  'sameDirectionPreferred',
  'angleMixMode',
  'ruleStrategy',
  'minSupportedLengthMm',
  'maxSupportedLengthMm',
  'fixedDecisionLengthMm',
])

function applyEngineConfigToControls(
  current: BatchEngineControls,
  config: CuttingEngineConfig
): BatchEngineControls {
  return {
    ...current,
    knifeGapMm: config.knifeGapMm,
    edgeTrimMm: config.edgeTrimMm,
    maxSolveDurationSeconds: config.maxSolveDurationSeconds,
    splitPenaltyWeight: config.splitPenaltyWeight,
    mustFulfillPenaltyWeight: config.mustFulfillPenaltyWeight,
    directionSwitchPenaltyWeight: config.directionSwitchPenaltyWeight,
    sameDirectionPreferred: config.sameDirectionPreferred,
    angleMixMode: config.angleMixMode,
    ruleStrategy: config.ruleStrategy,
    minSupportedLengthMm: config.minSupportedLengthMm,
    maxSupportedLengthMm: config.maxSupportedLengthMm,
    fixedDecisionLengthMm: config.fixedDecisionLengthMm,
  }
}

export function useBatchEnginePageState() {
  const engineConfig = useCuttingEngineConfigStore((state) => state.config)
  const updateEngineConfigDraft = useCuttingEngineConfigStore(
    (state) => state.updateDraft
  )
  const [localControls, setLocalControls] = useState<BatchEngineControls>(() =>
    buildBatchEngineControlsFromConfig(engineConfig)
  )
  const controls = useMemo(
    () => applyEngineConfigToControls(localControls, engineConfig),
    [engineConfig, localControls]
  )

  const updateControl = <K extends keyof BatchEngineControls>(
    key: K,
    value: BatchEngineControls[K]
  ) => {
    if (ENGINE_CONFIG_CONTROL_KEYS.has(key)) {
      updateEngineConfigDraft({ [key]: value } as Partial<CuttingEngineConfig>)
      return
    }
    setLocalControls((current) => ({ ...current, [key]: value }))
  }

  return {
    controls,
    updateControl,
  }
}
