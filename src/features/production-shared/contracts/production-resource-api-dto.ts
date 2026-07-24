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

export interface ProductionRouteStepApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  routeId?: string
  sequence: number
  segmentId: string
  segmentName?: string
  processStepId: string
  processCode?: string
  processName?: string
  executionMode: string
  qualityGate: string
  estimatedMinutes: number
  transferRequired: boolean
  description?: string
}

export interface ProductionRouteApiDTO {
  id: string
  createdAt?: string
  updatedAt?: string
  code: string
  name: string
  productId?: string
  productName?: string
  productTemplateId?: string
  description?: string
  version: number
  status: string
  steps: ProductionRouteStepApiDTO[]
}

export interface ProductionRoutesResponseApiDTO {
  items: ProductionRouteApiDTO[]
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

export type SaveProductionRouteApiDTO = ProductionRouteApiDTO

export type SaveProductionProcessStepApiDTO = ProductionProcessStepApiDTO
