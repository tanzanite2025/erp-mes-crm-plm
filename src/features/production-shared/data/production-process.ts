export interface ProductionProcessAllowedPosition {
  id: string
  code?: string
  name: string
  orgUnitId?: string
  orgUnitName?: string
  status: string
}

export interface ProductionProcessStep {
  id: string
  code?: string
  name: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  isActive?: boolean
  allowedPositionIds?: string[]
  allowedPositions?: ProductionProcessAllowedPosition[]
  createdAt?: string
  updatedAt?: string
}
