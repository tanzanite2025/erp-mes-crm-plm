export interface ControlledProtocolCriterion {
  id: string
  itemName: string
  targetWeight: number
  unit: string
  aLevelTolerance: number
  bLevelTolerance: number
}

export interface ControlledProtocolDraft {
  productId: string
  productName: string
  criteria: ControlledProtocolCriterion[]
}
