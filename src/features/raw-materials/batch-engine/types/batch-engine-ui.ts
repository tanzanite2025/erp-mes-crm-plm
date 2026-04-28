export type BatchEngineLegendTone = 'roll' | 'strip' | 'piece' | 'loss'

export type BatchEngineLegendItem = {
  key: string
  label: string
  tone: BatchEngineLegendTone
}

export type BatchEngineMetric = {
  key: string
  label: string
  value: string
  hint: string
}
