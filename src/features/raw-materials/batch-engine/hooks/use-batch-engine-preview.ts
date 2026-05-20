import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import { buildBatchEngineDemandLinesFromCuttingPlan } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import { buildBatchEngineLegend } from '../domain/build-batch-engine-metrics'
import { buildBatchEnginePreview } from '../domain/build-batch-engine-preview'
import { resolveBatchEngineControls } from '../services/resolve-batch-engine-controls'
import type { BatchEngineControls } from '../types'

type UseBatchEnginePreviewOptions = {
  controls: BatchEngineControls
  selectedCuttingPlan?: CuttingPlan
  cutSizeUnits: CutSizeUnit[]
  selectedPrepregSpec?: PrepregMaterialSpec
}

export function useBatchEnginePreview(options: UseBatchEnginePreviewOptions) {
  const { t } = useLanguage()
  const { controls, selectedCuttingPlan, cutSizeUnits, selectedPrepregSpec } = options

  const controlState = useMemo(
    () => resolveBatchEngineControls(controls, selectedPrepregSpec),
    [controls, selectedPrepregSpec]
  )

  const mappedDemandLines = useMemo(
    () => buildBatchEngineDemandLinesFromCuttingPlan(selectedCuttingPlan, cutSizeUnits),
    [cutSizeUnits, selectedCuttingPlan]
  )

  const simulation = useMemo(
    () => buildBatchEnginePreview(selectedCuttingPlan, mappedDemandLines, controlState.normalizedControls),
    [controlState.normalizedControls, mappedDemandLines, selectedCuttingPlan]
  )

  const legend = useMemo(() => buildBatchEngineLegend(t), [t])

  return {
    controls: controlState.resolvedControls,
    normalizedControls: controlState.normalizedControls,
    mappedDemandLines,
    simulation,
    legend,
  }
}
