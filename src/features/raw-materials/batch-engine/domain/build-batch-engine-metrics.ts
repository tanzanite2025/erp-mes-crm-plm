import type { BatchEngineLegendItem, BatchEngineTranslate } from '../types'

export function buildBatchEngineLegend(
  t: BatchEngineTranslate
): BatchEngineLegendItem[] {
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
