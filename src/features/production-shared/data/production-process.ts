export interface ProductionProcessStep {
  id: string
  code?: string
  name: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}
