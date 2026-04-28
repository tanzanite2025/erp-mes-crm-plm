import { useMemo } from 'react'
import { useLanguage } from '@/context/language-provider'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import { buildBatchEngineDemandLinesFromCuttingPlan } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'
import { buildBatchEngineMetrics, buildBatchEngineLegend } from '../domain/build-batch-engine-metrics'
import { buildBatchEnginePreview } from '../domain/build-batch-engine-preview'
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

  const effectiveControls = useMemo<BatchEngineControls>(
    () => ({
      ...controls,
      rollWidthMm: selectedPrepregSpec?.widthMm?.trim() || '',
      rollLengthM: selectedPrepregSpec?.lengthM?.trim() || '',
    }),
    [controls, selectedPrepregSpec?.lengthM, selectedPrepregSpec?.widthMm]
  )

  const mappedDemandLines = useMemo(
    () => buildBatchEngineDemandLinesFromCuttingPlan(selectedCuttingPlan, cutSizeUnits),
    [cutSizeUnits, selectedCuttingPlan]
  )

  const simulation = useMemo(
    () => buildBatchEnginePreview(selectedCuttingPlan, mappedDemandLines, effectiveControls),
    [effectiveControls, mappedDemandLines, selectedCuttingPlan]
  )

  const metrics = useMemo(
    () => buildBatchEngineMetrics({ t, controls: effectiveControls, selectedCuttingPlan, simulation }),
    [effectiveControls, selectedCuttingPlan, simulation, t]
  )

  const legend = useMemo(() => buildBatchEngineLegend(t), [t])

  return {
    controls: effectiveControls,
    mappedDemandLines,
    simulation,
    metrics,
    legend,
  }
}
