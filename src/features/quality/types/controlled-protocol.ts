import type { LevelConfig } from '../data/schema'

export interface ControlledProtocolCriterion {
  gradingMode: 'DEVIATION_BANDS'
  levels: LevelConfig[]
  id: string
  itemName: string
  inspectionStageId: string
  inspectionStageName: string
  targetWeight: number
  unit: string
}

export interface ControlledProtocolDraft {
  productId: string
  productName: string
  criteria: ControlledProtocolCriterion[]
}
