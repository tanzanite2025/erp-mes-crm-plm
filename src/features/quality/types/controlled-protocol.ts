export interface ControlledProtocolCriterion {
  id: string
  itemName: string
  targetWeight: number
  unit: string
  qualifiedMin?: number
  qualifiedMax?: number
  scrapBelow?: number
  scrapAbove?: number
}

export interface ControlledProtocolDraft {
  productId: string
  productName: string
  criteria: ControlledProtocolCriterion[]
}
