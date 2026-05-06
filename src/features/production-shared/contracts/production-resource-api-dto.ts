export interface ProductionProcessStepApiDTO {
  id: string
  code?: string
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductionLineSegmentApiDTO {
  id: string
  lineId?: string
  name: string
  hierarchyOptionId?: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown> | null
  jobCategories: ProductionJobCategoryApiDTO[]
  createdAt?: string
  updatedAt?: string
}

export interface ProductionJobCategoryApiDTO {
  id: string
  segmentId?: string
  name: string
  hierarchyOptionId?: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown> | null
  processes: ProductionProcessStepApiDTO[]
  createdAt?: string
  updatedAt?: string
}

export interface ProductionLineApiDTO {
  id: string
  code: string
  name: string
  description: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  segments: ProductionLineSegmentApiDTO[]
}

export interface ProductionLinesResponseApiDTO {
  items: ProductionLineApiDTO[]
}

export interface ProductionProcessStepsResponseApiDTO {
  items: ProductionProcessStepApiDTO[]
}

export interface ProductionMessageApiDTO {
  message: string
}

export interface SaveProductionLineApiDTO extends ProductionLineApiDTO {
  authCode?: string
}

export type SaveProductionProcessStepApiDTO = ProductionProcessStepApiDTO
