import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type {
  BatchEngineControls,
  BatchEngineLegendItem,
  BatchEngineMetric,
  BatchEngineSimulation,
  BatchEngineTranslate,
} from '../types'

type BuildBatchEngineMetricsOptions = {
  t: BatchEngineTranslate
  controls: BatchEngineControls
  selectedCuttingPlan?: CuttingPlan
  simulation: BatchEngineSimulation
}

export function buildBatchEngineMetrics(options: BuildBatchEngineMetricsOptions): BatchEngineMetric[] {
  const { t, controls, selectedCuttingPlan, simulation } = options

  return [
    {
      key: 'roll',
      label: t('rawMaterials.batchEngine.metrics.roll.label'),
      value: `${controls.rollLengthM || '--'}m x ${controls.rollWidthMm || '--'}mm`,
      hint: t('rawMaterials.batchEngine.metrics.roll.hint'),
    },
    {
      key: 'mode',
      label: t('rawMaterials.batchEngine.metrics.mode.label'),
      value: t('rawMaterials.batchEngine.metrics.mode.value'),
      hint: selectedCuttingPlan
        ? t('rawMaterials.batchEngine.metrics.mode.currentCuttingPlan', {
            name: selectedCuttingPlan.name || '--',
            lineCount: selectedCuttingPlan.lines.length,
          })
        : t('rawMaterials.batchEngine.metrics.mode.hint'),
    },
    {
      key: 'loss',
      label: t('rawMaterials.batchEngine.metrics.loss.label'),
      value: `${simulation.lossAreaM2.toFixed(3)} m2`,
      hint: simulation.ready
        ? t('rawMaterials.batchEngine.metrics.loss.utilizationHint', {
            percent: simulation.utilizationPercent.toFixed(2),
            occupiedArea: simulation.totalOccupiedAreaM2.toFixed(3),
          })
        : t('rawMaterials.batchEngine.metrics.loss.hint'),
    },
  ]
}

export function buildBatchEngineLegend(t: BatchEngineTranslate): BatchEngineLegendItem[] {
  return [
    {
      key: 'roll',
      label: t('rawMaterials.batchEngine.legend.roll'),
      tone: 'roll',
    },
    {
      key: 'strip',
      label: t('rawMaterials.batchEngine.legend.strip'),
      tone: 'strip',
    },
    {
      key: 'piece',
      label: t('rawMaterials.batchEngine.legend.piece'),
      tone: 'piece',
    },
    {
      key: 'loss',
      label: t('rawMaterials.batchEngine.legend.loss'),
      tone: 'loss',
    },
  ]
}
