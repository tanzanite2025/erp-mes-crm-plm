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

type BatchEngineLocalControlState = {
  configRevision: number
  values: Partial<BatchEngineControls>
}

function pickSimulationControlValues(
  values: Partial<BatchEngineControls>
): Partial<BatchEngineControls> {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key]) =>
        !ENGINE_CONFIG_CONTROL_KEYS.has(key as keyof BatchEngineControls)
    )
  ) as Partial<BatchEngineControls>
}

export function useBatchEnginePageState() {
  const engineConfig = useCuttingEngineConfigStore((state) => state.config)
  const engineConfigRevision = useCuttingEngineConfigStore(
    (state) => state.revision
  )
  const [localControls, setLocalControls] =
    useState<BatchEngineLocalControlState>(() => ({
      configRevision: engineConfigRevision,
      values: {},
    }))
  const controls = useMemo(() => {
    const baseControls = buildBatchEngineControlsFromConfig(engineConfig)
    const localValues =
      localControls.configRevision === engineConfigRevision
        ? localControls.values
        : pickSimulationControlValues(localControls.values)
    return {
      ...baseControls,
      ...localValues,
    }
  }, [engineConfig, engineConfigRevision, localControls])

  const updateControl = <K extends keyof BatchEngineControls>(
    key: K,
    value: BatchEngineControls[K]
  ) => {
    setLocalControls((current) => {
      const currentValues =
        current.configRevision === engineConfigRevision
          ? current.values
          : pickSimulationControlValues(current.values)
      return {
        configRevision: engineConfigRevision,
        values: {
          ...currentValues,
          [key]: value,
        },
      }
    })
  }

  return {
    controls,
    updateControl,
  }
}
