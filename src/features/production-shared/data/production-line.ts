import type { ProductionProcessStep } from './production-process'

export type { ProductionProcessStep } from './production-process'

export interface ProductionJobCategory {
  id: string
  segmentId?: string
  name: string
  hierarchyOptionId?: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  processes: ProductionProcessStep[]
  createdAt?: string
  updatedAt?: string
}

export interface ProductionSegment {
  id: string
  name: string
  hierarchyOptionId?: string
  description?: string
  sortOrder?: number
  attributes?: Record<string, unknown>
  jobCategories: ProductionJobCategory[]
  updatedAt?: string
}

export interface ProductionLine {
  id: string
  code: string
  name: string
  description: string
  version: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  segments: ProductionSegment[]
}

export interface ProductionTopologyTemplate {
  id: string
  name: string
  description?: string
  segments: ProductionSegment[]
  createdAt: string
}
